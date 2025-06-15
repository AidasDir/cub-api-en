import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface NotificationsAddPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const NotificationsAddPage: React.FC<NotificationsAddPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Notifications Add"
      description="Add a new notification."
      method="POST"
      path="/notifications/add"
      bodyParams={[
        {
          name: "data",
          type: "object",
          description: "JSON card with required fields:",
          defaultValue: "{...}",
          options: [
            "poster_path",
            "overview",
            "release_date",
            "genre_ids",
            "id",
            "original_title",
            "original_language",
            "title",
            "backdrop_path",
            "popularity",
            "vote_count",
            "vote_average",
            "imdb_id",
            "kinopoisk_id",
            "original_name",
            "name",
            "first_air_date",
            "origin_country",
            "status",
            "pg",
            "release_quality",
            "imdb_rating",
            "kp_rating",
            "source",
            "number_of_seasons",
            "number_of_episodes",
            "next_episode_to_air",
            "img",
            "poster",
            "background_image",
          ],
        },
        {
          name: "voice",
          type: "string",
          description:
            'Name of the translation, e.g., LostFilm. <a href="#card-translations" class="underline text-[#aa566f]">Get a list of available translations</a> (required).',
          defaultValue: "",
        },
        {
          name: "season",
          type: "integer",
          description: "Season number to stop at (default 1).",
          defaultValue: "1",
        },
        {
          name: "episode",
          type: "integer",
          description: "Episode number to stop at (default 1).",
          defaultValue: "1",
        },
      ]}
      note_title="To access this API method, you need to be authorized."
      note_content={
        <>
          To do this, please enter your token. If you don't have
          one, you can{" "}
          <a
            href="#device-add"
            className="underline text-[#aa566f]"
            // onClick={() => props.setCurrentPage("#device-add")}
          >
            get it here
          </a>
          .
        </>
      }
      exampleResponse={JSON.stringify({ success: true }, null, 2)}
      errors={[
        {
          statusCode: 300,
          description: "Error in data",
        },
        {
          statusCode: 429,
          description: "Notification limit exceeded",
        },
      ]}
      token={props.token}
      profile={props.profile}
      setToken={props.setToken}
      setProfile={props.setProfile}
      requiresAuth={true}
      defaultStatus={200}
      refreshToken={props.generateAndSetCustomToken}
    />
  );
};

export default NotificationsAddPage;
