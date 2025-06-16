const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('./middleware/auth');
const { authenticateMagicUser } = require('./middleware/auth');
const crypto = require('crypto');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, // Vercel injects this
  ssl: {
    rejectUnauthorized: false // Required for Vercel Postgres, unless you configure specific CA certs
  }
});

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('Database connected:', result.rows[0].now);
  });
});

app.get('/', (req, res) => {
  res.send('CUB API Backend is running!');
});

// Device Add Endpoint - No authentication required
app.post('/api/device/add', async (req, res) => {
  const { code, email } = req.body;

  if (!code) {
    return res.status(400).json({ error: true, code: 400, text: 'Access code is required.' });
  }

  if (!email) {
    return res.status(400).json({ error: true, code: 400, text: 'User email is required for device registration.' });
  }

  try {
    const client = await pool.connect();

    try {
      // 1. Validate the access code
      const codeResult = await client.query('SELECT * FROM access_codes WHERE code = $1 AND expires_at > NOW()', [code]);

      if (codeResult.rows.length === 0) {
        return res.status(400).json({ error: true, code: 400, text: 'Invalid or expired access code.' });
      }

      // 2. Delete the used access code to prevent reuse
      await client.query('DELETE FROM access_codes WHERE code = $1', [code]);

      let user;
      let isNewUser = false;
      // Find user by the provided email or create a new one
      const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      } else {
        // If no user, create a new one with the provided email
        const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10); // Generate a random password
        const newUserResult = await client.query(
          'INSERT INTO users (email, password_hash, created_at, updated_at, premium_days, n_movie, n_tv, n_voice) VALUES ($1, $2, NOW(), NOW(), 0, 1, 1, 1) RETURNING *',
          [email, hashedPassword]
        );
        user = newUserResult.rows[0];
        isNewUser = true;
      }

      // Find or create a default profile for this user
      let profileResult = await client.query('SELECT * FROM profiles WHERE user_id = $1 AND name = $2', [user.id, 'Общий']);
      let profile;
      let isNewProfile = false;
      if (profileResult.rows.length > 0) {
        profile = profileResult.rows[0];
      } else {
        const newProfileResult = await client.query(
          'INSERT INTO profiles (user_id, name, main, icon) VALUES ($1, $2, $3, $4) RETURNING *',
          [user.id, 'Общий', 1, 'l_1']
        );
        profile = newProfileResult.rows[0];
        isNewProfile = true;
        // If user was just created, set their profile column to this new profile's id
        if (isNewUser) {
          await client.query('UPDATE users SET profile = $1 WHERE id = $2', [profile.id, user.id]);
          user.profile = profile.id;
        }
      }

      // Generate new session token
      const payloadObj = { id: user.id, hash: '' };
      const payloadStr = JSON.stringify(payloadObj);
      const payloadB64 = Buffer.from(payloadStr).toString('base64url');
      const signature = crypto.randomBytes(32).toString('base64url');
      const newSessionToken = `${payloadB64}.${signature}`;

      // Hash the new session token for storage
      const hashedToken = await bcrypt.hash(newSessionToken, 10);

      await client.query(
        'INSERT INTO devices (user_id, device_code, access_token, profile_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [user.id, code, hashedToken, profile.id] // 'code' is the device access code from req.body
      );

      // Send Success Response, including the new session token
      return res.status(200).json({
        success: true,
        email: user.email,
        id: user.id,
        token: newSessionToken,
        profile: {
          id: profile.id,
          cid: profile.user_id,
          name: profile.name,
          main: profile.main,
          icon: profile.icon
        }
      });

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error in /api/device/add:', err.message); // Log the actual error message
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// New Endpoint: Generate Access Code
app.get('/api/device/generate-code', authenticateToken, async (req, res) => {
  try {
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a random 6-digit number
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // Code valid for 20 minutes

    // Get the user's email from the users table using req.user.id
    let userEmail = null;
    if (req.user && req.user.id) {
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      if (userResult.rows.length > 0) {
        userEmail = userResult.rows[0].email;
      }
    }

    // Store the generated code in the database
    await pool.query(
      'INSERT INTO access_codes (code, expires_at, user_email) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET expires_at = $2, user_email = $3',
      [generatedCode, expiresAt, userEmail]
    );

    res.json({ success: true, code: generatedCode });
  } catch (err) {
    console.error('Error generating access code:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error during code generation.' });
  }
});

// Bookmarks All Endpoint - No authentication required for testing
app.get('/api/bookmarks/all', authenticateToken, async (req, res) => {
  const { full, type } = req.query;
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  if (!profileId) {
    return res.status(400).json({ error: true, code: 400, text: 'Profile ID is required in the Profile header.' });
  }

  try {
    let bookmarksQuery = 'SELECT id, user_id AS cid, type, data, card_id, profile_id AS profile, time FROM bookmarks WHERE user_id = $1 AND profile_id = $2';
    const bookmarksParams = [userId, profileId];

    if (type) {
      bookmarksQuery += ' AND type = $3';
      bookmarksParams.push(type);
    }
    bookmarksQuery += ' ORDER BY time DESC';

    const allBookmarksResult = await pool.query(bookmarksQuery, bookmarksParams);
    let allBookmarks = allBookmarksResult.rows;

    // Aggregate counts by type dynamically
    const typeCountsResult = await pool.query(
      'SELECT type, COUNT(*) FROM bookmarks WHERE user_id = $1 AND profile_id = $2 GROUP BY type',
      [userId, profileId]
    );
    let aggregatedCounts = typeCountsResult.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count, 10)
    }));

    // Ensure default types are present even if count is 0
    const defaultTypes = ["book", "history", "like", "wath"];
    defaultTypes.forEach(defaultType => {
      if (!aggregatedCounts.find(item => item.type === defaultType)) {
        aggregatedCounts.push({ type: defaultType, count: 0 });
      }
    });

    // Sort to maintain consistent order if needed (optional, but good practice)
    aggregatedCounts.sort((a, b) => a.type.localeCompare(b.type));

    // Parse JSON data for each bookmark if it's a string
    const parsedBookmarks = allBookmarks.map(bookmark => {
      try {
        return { ...bookmark, data: JSON.stringify(bookmark.data) };
      } catch (e) {
        console.error("Error parsing bookmark data:", e);
        return bookmark; // Return original if parsing fails
      }
    });

    res.json({
      secuses: true, // Changed from 'success' to 'secuses'
      bookmarks: parsedBookmarks,
      counts: aggregatedCounts,
    });

  } catch (err) {
    console.error('Error in /api/bookmarks/all:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Bookmarks Add Endpoint
app.post('/api/bookmarks/add', authenticateToken, async (req, res) => {
  const { data, type } = req.body;
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  console.log('Bookmarks Add: userId=', userId, 'profileId=', profileId);

  if (!data || !type) {
    return res.status(400).json({ error: true, code: 300, text: 'Ошибка в данных' });
  }

  // Validate if 'data' is a non-null object
  if (typeof data !== 'object' || data === null) {
    return res.status(400).json({ error: true, code: 300, text: 'Ошибка в данных' });
  }

  try {
    console.log('Type of data (before stringify for DB):', typeof data, 'Data:', data); // Add this line for debugging

    // Explicitly stringify data for storage in JSONB column as requested by user
    let dataToStore;
    try {
      dataToStore = JSON.stringify(data);
    } catch (e) {
      console.error('Error stringifying data for /api/bookmarks/add:', e);
      return res.status(400).json({ error: true, code: 300, text: 'Ошибка в данных' });
    }
    console.log('Data stringified for DB storage:', dataToStore);

    const cardId = data.id || null; // data is already an object here

    let finalCardId;
    if (data.id === "123456789" || !data.id) {
      // If data.id is the default placeholder or not provided, generate a UUID
      finalCardId = crypto.randomUUID(); // Generate a UUID
    } else {
      // Otherwise, use the provided data.id
      finalCardId = data.id;
    }

    const result = await pool.query(
      'INSERT INTO bookmarks (user_id, profile_id, type, data, card_id, time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id AS cid, type, data, card_id, profile_id AS profile, time',
      [userId, profileId, type, dataToStore, finalCardId, Date.now()] // Use dynamic userId and profileId, and the determined cardId
    );

    const newBookmark = result.rows[0];

    console.log('Bookmarks Add: newBookmark object=', newBookmark); // Add this line

    res.json({
      secuses: true,
      bookmark: {
        id: newBookmark.id,
        type: newBookmark.type,
        data: JSON.stringify(newBookmark.data),
        card_id: newBookmark.card_id,
        profile: newBookmark.profile,
        time: newBookmark.time
      },
      write: "insert"
    });
  } catch (err) {
    console.error('Error in /api/bookmarks/add:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Bookmarks Remove Endpoint
app.post('/api/bookmarks/remove', authenticateToken, async (req, res) => {
  const { id, list } = req.body;
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  console.log('Bookmarks Remove: Received ID:', id, 'Type:', typeof id);
  console.log('Bookmarks Remove: Received List:', list, 'Type:', typeof list);

  if (!id && (!list || !Array.isArray(list) || list.length === 0)) {
    return res.status(400).json({ error: true, code: 400, text: 'Either an ID or a list of IDs is required.' });
  }

  try {
    let query;
    let params;

    if (id) {
      query = 'DELETE FROM bookmarks WHERE user_id = $1 AND profile_id = $2 AND id = $3 RETURNING id';
      params = [userId, profileId, id];
    } else if (list) {
      // For deleting multiple IDs, use an IN clause
      // Ensure that list contains only integers to prevent SQL injection for direct use in IN clause
      const placeholders = list.map((_, i) => `$${i + 3}`).join(',');
      query = `DELETE FROM bookmarks WHERE user_id = $1 AND profile_id = $2 AND id IN (${placeholders}) RETURNING id`;
      params = [userId, profileId, ...list];
    }

    const result = await pool.query(query, params);

    if (result.rows.length > 0) {
      res.json({ success: true, message: `${result.rows.length} bookmark(s) removed successfully.` });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'No bookmarks found with the provided ID(s) for this user and profile.' });
    }
  } catch (err) {
    console.error('Error in /api/bookmarks/remove:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Card Season Endpoint
app.post('/api/card/season', authenticateToken, async (req, res) => {
  const { id, original_name, season } = req.body;

  if (!id || !original_name || !season) {
    return res.status(400).json({ error: true, code: 400, text: 'Card ID, original name, and season number are required.' });
  }

  try {
    // Assuming 'season_info' in the cards table directly contains the season data
    // For a more complex structure (e.g., season_info is an array of seasons), 
    // you'd need to query within the JSONB.
    const result = await pool.query(
      'SELECT season_info FROM cards WHERE id = $1 AND original_name = $2',
      [id, original_name]
    );

    if (result.rows.length > 0 && result.rows[0].season_info) {
      const seasonInfo = result.rows[0].season_info;
      // In a real scenario, you'd find the specific season data within seasonInfo 
      // based on the 'season' parameter if seasonInfo contains multiple seasons.
      // For now, we'll return the whole season_info if it exists.

      // Example from the user's prompt: { "season": { ... } }
      res.json({ success: true, season: seasonInfo });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'Season information not found for the given card.' });
    }
  } catch (err) {
    console.error('Error in /api/card/season:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Card Subscribed Endpoint
app.post('/api/card/subscribed', authenticateToken, async (req, res) => {
  const { id } = req.body; // card ID
  const userId = req.user.id; // Get userId from authenticated token

  if (!id) {
    return res.status(400).json({ error: true, code: 400, text: 'Card ID is required.' });
  }

  try {
    // Check if the user has premium days (simulating subscription)
    const userResult = await pool.query('SELECT premium_days FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0 || userResult.rows[0].premium_days === null || userResult.rows[0].premium_days <= 0) {
      // User not found or no premium access
      return res.status(466).json({ error: true, code: 466, text: 'No subscriptions' });
    }

    // In a real application, you might also check a specific subscriptions table
    // to see if the user is subscribed to this particular card ID.
    // For this clone, having premium days implies general subscription capability.
    res.json({ success: true, subscribed: true });

  } catch (err) {
    console.error('Error in /api/card/subscribed:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Card Translations Endpoint
app.post('/api/card/translations', authenticateToken, async (req, res) => {
  const { id, season } = req.body;

  if (!id || !season) {
    return res.status(400).json({ error: true, code: 400, text: 'Card ID and season number are required.' });
  }

  try {
    // Assuming translations are part of the season_info JSONB or a separate JSONB column.
    // For this example, let's assume season_info contains a 'translations' array or object.
    const result = await pool.query(
      'SELECT season_info FROM cards WHERE id = $1',
      [id]
    );

    if (result.rows.length > 0 && result.rows[0].season_info) {
      const seasonInfo = result.rows[0].season_info;
      // In a real application, you would parse the seasonInfo to find translations for the specific season.
      // For now, we'll return a dummy translation structure or a part of the seasonInfo.
      
      // Example from the user's prompt: { lang: 'en', title: 'Title' }
      // This suggests a simpler structure for translations, which might be different from season details.
      // Let's assume `seasonInfo.episodes` might have a `name` which can act as a title for translations.

      const translations = { 
        lang: 'en', 
        title: `Translation for card ${id}, season ${season}` 
      }; // Dummy response

      if (seasonInfo.episodes && Array.isArray(seasonInfo.episodes)) {
        const relevantSeasonEpisode = seasonInfo.episodes.find(ep => ep.season_number === parseInt(season));
        if (relevantSeasonEpisode) {
          translations.title = relevantSeasonEpisode.name; // Use episode name as title if available
        }
      }

      res.json({ success: true, ...translations });

    } else {
      res.status(404).json({ error: true, code: 404, text: 'Card or season information not found for translations.' });
    }
  } catch (err) {
    console.error('Error in /api/card/translations:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Card Unsubscribe Endpoint
app.post('/api/card/unsubscribe', authenticateToken, async (req, res) => {
  const { id } = req.body; // card ID
  const userId = req.user.id; // Get userId from authenticated token

  if (!id) {
    return res.status(400).json({ error: true, code: 400, text: 'Card ID is required.' });
  }

  try {
    // In a real application, you would update a subscription status in the database
    // related to this user and card ID. For this clone, we'll simulate success
    // if the user has premium access (as per card/subscribed logic) or return 500 if not.

    const userResult = await pool.query('SELECT premium_days FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0 || userResult.rows[0].premium_days === null || userResult.rows[0].premium_days <= 0) {
      // This matches the error from the frontend documentation for card-unsubscribe 500 error.
      return res.status(500).json({ error: true, code: 500, text: 'An unexpected error occurred or did not subscribe to the translation' });
    }

    res.json({ success: true, message: 'Successfully unsubscribed from card.' });

  } catch (err) {
    console.error('Error in /api/card/unsubscribe:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Notice All Endpoint
app.get('/api/notice/all', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  try {
    const result = await pool.query('SELECT message, is_cleared, created_at FROM notices WHERE user_id = $1 AND profile_id = $2', [userId, profileId]);
    res.json({ secuses: true, notice: result.rows });
  } catch (err) {
    console.error('Error in /api/notice/all:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Notice Clear Endpoint
app.get('/api/notice/clear', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  try {
    // Update all notices for the user and profile to be cleared
    await pool.query(
      'UPDATE notices SET is_cleared = TRUE WHERE user_id = $1 AND profile_id = $2',
      [userId, profileId]
    );
    res.json({ success: true, message: 'All notices cleared successfully.' });
  } catch (err) {
    console.error('Error in /api/notice/clear:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Notifications All Endpoint
app.get('/api/notifications/all', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  try {
    const result = await pool.query(
      'SELECT id, user_id AS cid, profile_id AS profile, voice, card_id, card, status, time, time_update, episode, season FROM notifications WHERE user_id = $1 AND profile_id = $2 ORDER BY time DESC',
      [userId, profileId]
    );

    const notifications = result.rows.map(notification => {
      try {
        // Ensure the 'card' field is a string representation of the JSON data
        // Ensure 'status' is 1 if it's null
        return { ...notification, card: JSON.stringify(notification.card), status: notification.status === null ? 1 : notification.status };
      } catch (e) {
        console.error("Error processing notification card data:", e);
        return notification; // Return original if an error occurs
      }
    });

    res.json({ secuses: true, notifications: notifications });
  } catch (err) {
    console.error('Error in /api/notifications/all:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Notifications Add Endpoint
app.post('/api/notifications/add', authenticateToken, async (req, res) => {
  const { data, voice, season = 1, episode = 1 } = req.body;
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  console.log('Notifications Add: userId=', userId, 'profileId=', profileId); // Add this line for debugging

  if (!data || !voice) {
    return res.status(400).json({ error: true, code: 400, text: 'Data and voice are required.' });
  }

  // Validate if 'data' is a non-null object
  if (typeof data !== 'object' || data === null) {
    return res.status(400).json({ error: true, code: 400, text: 'Invalid data format.' });
  }

  try {
    // Explicitly stringify data for storage in JSONB column
    let dataToStore;
    try {
      dataToStore = JSON.stringify(data);
    } catch (e) {
      console.error('Error stringifying data for /api/notifications/add (JSON.stringify):', e);
      return res.status(400).json({ error: true, code: 400, text: 'Invalid data format.' });
    }

    let finalCardId;
    if (data.id) {
      finalCardId = String(data.id); // Ensure card_id is a string
    } else {
      finalCardId = crypto.randomUUID(); // Generate UUID if data.id is not present
    }

    // Check if notification with this card_id already exists for the user and profile
    console.log('Checking for existing notification with card_id:', finalCardId, 'userId:', userId, 'profileId:', profileId);
    const existingNotification = await pool.query(
      'SELECT id FROM notifications WHERE card_id = $1 AND user_id = $2 AND profile_id = $3',
      [finalCardId, userId, profileId]
    );

    if (existingNotification.rows.length > 0) {
      // Update existing notification
      const notificationId = existingNotification.rows[0].id;
      console.log('Updating existing notification with ID:', notificationId);
      await pool.query(
        'UPDATE notifications SET voice = $1, time = $2 WHERE id = $3 AND user_id = $4 AND profile_id = $5 RETURNING id',
        [voice, Date.now(), notificationId, userId, profileId]
      );
      res.json({ success: true, message: 'Notification updated successfully.', id: notificationId });
    } else {
      // Simulate notification limit - e.g., max 10 notifications per user/profile
      console.log('Checking notification limit...');
      const notificationCountResult = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND profile_id = $2', [userId, profileId]);
      const currentNotificationCount = parseInt(notificationCountResult.rows[0].count, 10);
      const NOTIFICATION_LIMIT = 10; // This can be an environment variable

      if (currentNotificationCount >= NOTIFICATION_LIMIT) {
        return res.status(429).json({ error: true, code: 429, text: 'Notification limit exceeded' });
      }

      // Insert new notification
      console.log('Inserting new notification...');
      const result = await pool.query(
        'INSERT INTO notifications (user_id, profile_id, card, voice, season, episode, time, time_update, card_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [userId, profileId, dataToStore, voice, season, episode, Date.now(), Date.now(), finalCardId]
      );
      res.json({ success: true, message: 'Notification added successfully.', id: result.rows[0].id });
    }
  } catch (err) {
    console.error('Error in /api/notifications/add (Caught exception):', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Notifications Remove Endpoint
app.post('/api/notifications/remove', authenticateToken, async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  if (!id) {
    return res.status(400).json({ error: true, code: 400, text: 'Notification ID is required.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 AND profile_id = $3 RETURNING id',
      [id, userId, profileId]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Notification removed successfully.' });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'Notification not found or not authorized for this user/profile.' });
    }
  } catch (err) {
    console.error('Error in /api/notifications/remove:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Notifications Status Endpoint
app.post('/api/notifications/status', authenticateToken, async (req, res) => {
  const { id, status: statusString } = req.body; // Rename status to statusString to avoid conflict
  const userId = req.user.id; // Get userId from authenticated token
  const profileId = req.profileId; // Get profileId from authenticated token

  // Convert status to a number for validation
  const status = parseInt(statusString, 10);

  if (!id || (status === undefined || status === null || (status !== 0 && status !== 1))) {
    return res.status(400).json({ error: true, code: 400, text: 'Notification ID and a valid status (0 or 1) are required.' });
  }

  try {
    const result = await pool.query(
      'UPDATE notifications SET status = $1, time_update = $2::BIGINT WHERE id = $3 AND user_id = $4 AND profile_id = $5 RETURNING id',
      [status, String(BigInt(Date.now())), id, userId, profileId]
    );

    if (result.rows.length > 0) {
      // Frontend example response for notifications-status is: { enabled: true, unread_count: 5 }
      // We can return a simplified success or actual count/status based on further logic if needed.
      res.json({ success: true, message: 'Notification status updated successfully.' });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'Notification not found or not authorized for this user/profile.' });
    }
  } catch (err) {
    console.error('Error in /api/notifications/status:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Timeline All Endpoint
app.get('/api/timeline/all', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const profileId = req.profileId;
  const { full } = req.query;

  try {
    // For now, return a dummy response as requested.
    // In a real application, you would fetch timeline data from the database.
    res.json({
      secuses: true,
      timelines: {}
    });
  } catch (err) {
    console.error('Error in /api/timeline/all:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Profiles All Endpoint
app.get('/api/profiles/all', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get userId from authenticated token

  try {
    const result = await pool.query('SELECT id, user_id AS cid, name, main::int, icon FROM profiles WHERE user_id = $1', [userId]);
    res.json({ secuses: true, profiles: result.rows });
  } catch (err) {
    console.error('Error in /api/profiles/all:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Profiles Change Endpoint
app.post('/api/profiles/change', authenticateToken, async (req, res) => {
  const { id, name } = req.body;
  const userId = req.user.id; // Get userId from authenticated token

  if (!id || !name) {
    return res.status(400).json({ error: true, code: 400, text: 'Profile ID and name are required.' });
  }

  try {
    const result = await pool.query(
      'UPDATE profiles SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
      [name, id, userId]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Profile updated successfully.' });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'Profile not found or not authorized for this user.' });
    }
  } catch (err) {
    console.error('Error in /api/profiles/change:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Profiles Create Endpoint
app.post('/api/profiles/create', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id; // Get userId from authenticated token

  if (!name) {
    return res.status(400).json({ error: true, code: 400, text: 'Profile name is required.' });
  }

  try {
    // Implement a check for maximum number of profiles
    const userResult = await pool.query('SELECT premium FROM users WHERE id = $1', [userId]);
    const userPremiumStatus = userResult.rows.length > 0 ? userResult.rows[0].premium : 0;

    const profileCountResult = await pool.query('SELECT COUNT(*) FROM profiles WHERE user_id = $1', [userId]);
    const currentProfileCount = parseInt(profileCountResult.rows[0].count, 10);

    let MAX_PROFILES = 3; // Default limit for non-premium users
    if (userPremiumStatus === 1) {
      MAX_PROFILES = 8; // Limit for premium users
    }

    if (currentProfileCount >= MAX_PROFILES) {
      return res.status(400).json({ error: true, code: 400, text: 'Maximum number of profiles created.' });
    }

    const result = await pool.query(
      'INSERT INTO profiles (user_id, name, main, icon) VALUES ($1, $2, $3, $4) RETURNING id, user_id AS cid, name',
      [userId, name, 0, 'l_1']
    );
    res.json({
      secuses: true,
      profile: {
        id: result.rows[0].id,
        cid: result.rows[0].cid,
        name: result.rows[0].name,
      },
    });
  } catch (err) {
    console.error('Error in /api/profiles/create:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Profiles Remove Endpoint
app.post('/api/profiles/remove', authenticateToken, async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id; // Get userId from authenticated token

  if (!id) {
    return res.status(400).json({ error: true, code: 400, text: 'Profile ID is required.' });
  }

  try {
    // Prevent deleting the default profile if it's the only one or required
    // For simplicity, we allow deleting any profile for the authenticated user.
    const result = await pool.query(
      'DELETE FROM profiles WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Profile removed successfully.' });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'Profile not found or not authorized for this user.' });
    }
  } catch (err) {
    console.error('Error in /api/profiles/remove:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Profiles Active Endpoint
app.post('/api/profiles/active', authenticateToken, async (req, res) => {
  const { id } = req.body; // The profile ID to set as active
  const userId = req.user.id; // Get userId from authenticated token

  if (!id) {
    return res.status(400).json({ error: true, code: 400, text: 'Profile ID is required.' });
  }

  // Ensure id is a number
  const profileIdToSet = parseInt(id, 10);
  if (isNaN(profileIdToSet)) {
    return res.status(400).json({ error: true, code: 400, text: 'Invalid Profile ID format.' });
  }

  try {
    // Optional: Verify if the profile belongs to the user before setting it as active
    const profileCheck = await pool.query(
      'SELECT id FROM profiles WHERE id = $1 AND user_id = $2',
      [profileIdToSet, userId]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: true, code: 404, text: 'Profile not found or does not belong to this user.' });
    }

    // Update the 'profile' column in the 'users' table
    const result = await pool.query(
      'UPDATE users SET profile = $1 WHERE id = $2 RETURNING id',
      [profileIdToSet, userId]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Active profile updated successfully.' });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'User not found.' });
    }
  } catch (err) {
    console.error('Error in /api/profiles/active:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Reactions Get Endpoint
app.get('/api/reactions/get/:id', async (req, res) => {
  const { id } = req.params; // content ID

  if (!id) {
    return res.status(400).json({ error: true, code: 400, text: 'Content ID is required.' });
  }

  try {
    // Retrieve counts of each reaction type for the given content_id
    const result = await pool.query(
      'SELECT content_id AS card_id, type, COUNT(*) AS counter FROM reactions WHERE content_id = $1 GROUP BY content_id, type',
      [id]
    );

    res.json({ secuses: true, result: result.rows });
  } catch (err) {
    console.error('Error in /api/reactions/get:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Reactions Add Endpoint
app.get('/api/reactions/add/:content_id/:type', authenticateToken, async (req, res) => {
  const { content_id, type } = req.params;
  const userId = req.user.id; // Get userId from authenticated token

  if (!content_id || !type) {
    return res.status(400).json({ error: true, code: 400, text: 'Content ID and type are required.' });
  }

  try {
    // Check if the user has already left a reaction of this type for this content
    const existingReaction = await pool.query(
      'SELECT id FROM reactions WHERE user_id = $1 AND content_id = $2 AND type = $3',
      [userId, content_id, type]
    );

    if (existingReaction.rows.length > 0) {
      return res.status(500).json({ error: true, code: 500, text: 'You have already left the reaction' });
    }

    // Add the new reaction
    await pool.query(
      'INSERT INTO reactions (user_id, content_id, type, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, content_id, type]
    );

    res.json({ secuses: true });
  } catch (err) {
    console.error('Error in /api/reactions/add:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Users Find Endpoint
app.get('/api/users/find', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(500).json({ error: true, code: 400, text: 'Email cannot be empty.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, telegram_id, telegram_chat, n_movie, n_tv, n_voice, premium, backup, permission, bet, payout, profile FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User object from DB in /api/users/find:', user);
      res.json({
        success: true,
        id: user.id,
        email: user.email,
        profile: user.profile, // Directly use the profile ID from the users table
        telegram_id: user.telegram_id || 0,
        telegram_chat: user.telegram_chat || 0,
        n_movie: user.n_movie ?? 0,
        n_tv: user.n_tv ?? 0,
        n_voice: user.n_voice ?? 0,
        premium: user.premium || 0,
        backup: user.backup || 0,
        permission: user.permission || 0,
        bet: user.bet || "",
        payout: user.payout || 0
      });
    } else {
      res.status(500).json({ error: true, code: 300, text: 'User not found.' }); // Changed status and format
    }
  } catch (err) {
    console.error('Error in /api/users/find:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' }); // Changed error format
  }
});

// Users Get Endpoint
app.get('/api/users/get', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get userId from authenticated token

  try {
    const result = await pool.query('SELECT id, email, telegram_id, telegram_chat, n_movie, n_tv, n_voice, premium, backup, permission, bet, payout, profile FROM users WHERE id = $1', [userId]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({
        secuses: true,
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile, // Directly use the profile ID from the users table
          telegram_id: user.telegram_id || 0,
          telegram_chat: user.telegram_chat || 0,
          n_movie: user.n_movie ?? 0,
          n_tv: user.n_tv ?? 0,
          n_voice: user.n_voice ?? 0,
          premium: user.premium || 0,
          backup: user.backup || 0,
          permission: user.permission || 0,
          bet: user.bet || "",
          payout: user.payout || 0
        }
      });
    } else {
      res.status(404).json({ error: true, code: 404, text: 'User not found.' }); // Changed error format
    }
  } catch (err) {
    console.error('Error in /api/users/get:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Users Give Endpoint
app.post('/api/users/give', authenticateToken, async (req, res) => {
  const { to, days, password } = req.body;
  const giverUserId = req.user.id; // Get userId from authenticated token

  if (!to || !days || !password) {
    return res.status(400).json({ error: true, code: 400, text: 'Recipient ID, days, and password are required.' });
  }

  if (giverUserId === to) {
    return res.status(455).json({ error: true, code: 455, text: 'Cannot gift to yourself.' });
  }

  if (days < 5) {
    return res.status(400).json({ error: true, code: 400, text: 'Minimum 5 days required.' });
  }

  try {
    // 1. Verify giver's premium status and days
    const giverResult = await pool.query('SELECT password_hash, premium_days FROM users WHERE id = $1', [giverUserId]);

    if (giverResult.rows.length === 0) {
      return res.status(404).json({ error: true, code: 404, text: 'Giver user not found.' });
    }

    const giver = giverResult.rows[0];

    // For a real application, you'd hash the provided password and compare it with password_hash
    // const isPasswordValid = await bcrypt.compare(password, giver.password_hash);
    // For now, a simple direct comparison (DUMMY)
    if (giver.password_hash !== password) { // DUMMY: Replace with bcrypt.compare in real app
      return res.status(457).json({ error: true, code: 457, text: 'Password does not match.' });
    }

    if (!giver.premium_days || giver.premium_days < days) {
      return res.status(458).json({ error: true, code: 458, text: 'Insufficient CUB Premium days.' });
    }

    // 2. Find recipient user
    const recipientResult = await pool.query('SELECT id, premium_days FROM users WHERE id = $1', [to]);

    if (recipientResult.rows.length === 0) {
      return res.status(459).json({ error: true, code: 459, text: 'User not found.' });
    }

    const recipient = recipientResult.rows[0];
    const currentRecipientPremiumDays = recipient.premium_days || 0;

    // 3. Update giver's premium days
    await pool.query('UPDATE users SET premium_days = premium_days - $1 WHERE id = $2', [days, giverUserId]);

    // 4. Update recipient's premium days
    await pool.query('UPDATE users SET premium_days = $1 WHERE id = $2', [currentRecipientPremiumDays + days, to]);

    res.json({ success: true, message: `Successfully gifted ${days} premium days to user ${to}.` });

  } catch (err) {
    console.error('Error in /api/users/give:', err);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// API Checker Endpoint
app.get('/api/checker', (req, res) => {
  res.send('ok');
});

// API Root Endpoint
app.get('/api/', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    code: 404
  });
});

// New GET route to clear old token cookie
app.get('/api/auth/clear-old-token', (req, res) => {
  res.setHeader('Set-Cookie', [
    `token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
  ]);
  res.status(200).json({ message: 'Old token cookie clearing attempted. Please refresh your application or check your browser cookies.' });
});

// New Endpoint: Generate Custom Token for Authenticated User
app.post('/api/token/generate', authenticateMagicUser, async (req, res) => {
  try {
    const userEmail = req.user.email;
    if (!userEmail) {
      return res.status(401).json({ error: true, code: 401, text: 'Unauthorized: User email missing.' });
    }

    const client = await pool.connect();
    try {
      // Get user by email, or create if not exists
      let user;
      const userResult = await client.query('SELECT * FROM users WHERE email = $1', [userEmail]);
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      } else {
        // User not found, create a new one
        const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10); // Generate a random password
        const newUserResult = await client.query(
          'INSERT INTO users (email, password_hash, created_at, updated_at, premium_days, n_movie, n_tv, n_voice) VALUES ($1, $2, NOW(), NOW(), 0, 1, 1, 1) RETURNING *',
          [userEmail, hashedPassword]
        );
        user = newUserResult.rows[0];
      }

      // Find or create a default profile for this user
      let profileResult = await client.query('SELECT * FROM profiles WHERE user_id = $1 AND name = $2', [user.id, 'Общий']);
      let profile;
      if (profileResult.rows.length > 0) {
        profile = profileResult.rows[0];
      } else {
        const newProfileResult = await client.query(
          'INSERT INTO profiles (user_id, name, main, icon) VALUES ($1, $2, $3, $4) RETURNING *',
          [user.id, 'Общий', 1, 'l_1']
        );
        profile = newProfileResult.rows[0];
        // Set user's profile column if not set
        if (!user.profile) {
          await client.query('UPDATE users SET profile = $1 WHERE id = $2', [profile.id, user.id]);
        }
      }

      // Generate custom token (not JWT)
      const payloadObj = { id: user.id, hash: '' };
      const payloadStr = JSON.stringify(payloadObj);
      const payloadB64 = Buffer.from(payloadStr).toString('base64url');
      const signature = crypto.randomBytes(32).toString('base64url');
      const token = `${payloadB64}.${signature}`;

      // Hash the token and store device information
      const hashedToken = await bcrypt.hash(token, 10);
      const deviceCodeForSession = crypto.randomUUID();
      await client.query(
        'INSERT INTO devices (user_id, device_code, access_token, profile_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [user.id, deviceCodeForSession, hashedToken, profile.id]
      );

      // Send Success Response
      return res.status(200).json({
        success: true,
        email: user.email,
        id: user.id,
        token: token,
        profile: {
          id: profile.id,
          cid: profile.user_id,
          name: profile.name,
          main: profile.main,
          icon: profile.icon
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error in /api/token/generate:', err.message);
    res.status(500).json({ error: true, code: 500, text: 'Internal server error.' });
  }
});

// Only listen if not running on Vercel (Vercel handles listening)
// process.env.VERCEL is a system environment variable set by Vercel.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on PORT: ${port}`);
  });
}

module.exports = app;