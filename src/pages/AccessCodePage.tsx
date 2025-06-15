import React, { useState, useEffect } from 'react';
import { callCubApi } from '../api'; // Import callCubApi

interface AccessCodePageProps {
  userEmail: string | null;
  setToken: (token: string) => void; // Add setToken to props
  setProfile: (profile: string) => void; // Add setProfile to props
  token: string | null;
}

const AccessCodePage: React.FC<AccessCodePageProps> = ({ userEmail, setToken, setProfile, token }) => {
  const [deviceCode, setDeviceCode] = useState<string>('');
  const [inputEmail, setInputEmail] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const exampleDeviceAddResponse = JSON.stringify({
    success: true,
    email: "user@example.com",
    id: 12345,
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c", // Example JWT
    profile: { id: 67890, cid: 12345, name: "Общий", main: 1, icon: "l_1" }
  }, null, 2);

  const [responseHttpStatus, setResponseHttpStatus] = useState<number | null>(200);
  const [apiResponseData, setApiResponseData] = useState<string | null>(exampleDeviceAddResponse);

  const ACCESS_CODE_STORAGE_KEY = 'cub_access_code';

  useEffect(() => {
    if (userEmail) {
      setInputEmail(userEmail);
    } else {
      setInputEmail('');
    }
  }, [userEmail]);

  const generateAndStoreAccessCode = async () => {
    setLoading(true);
    setApiResponseData(null); // Clear previous/example response
    setResponseHttpStatus(null);
    // setLocalError(null); // No longer used
    // setLocalSuccessMessage(null); // No longer used
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Token'] = token;
      }

      const response = await callCubApi({
        endpoint: '/device/generate-code',
        method: 'GET',
        headers: headers,
      });

      if (response.success && response.data && typeof response.data === 'object' && 'code' in response.data) {
        const newCode = String(response.data.code);
        setGeneratedCode(newCode);
        setDeviceCode(newCode);
        localStorage.setItem(ACCESS_CODE_STORAGE_KEY, newCode);
        setResponseHttpStatus(response.status || 200);
        setApiResponseData(JSON.stringify(response.data, null, 2));
      } else {
        setResponseHttpStatus(response.status || 500);
        setApiResponseData(JSON.stringify(response.data || { error: response.error || 'Failed to generate access code.' }, null, 2));
      }
    } catch (err: any) {
      setResponseHttpStatus(500);
      setApiResponseData(JSON.stringify({ error: err.message || 'An unexpected error occurred while generating code.' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedCode = localStorage.getItem(ACCESS_CODE_STORAGE_KEY);
    if (storedCode) {
      setGeneratedCode(storedCode);
      setDeviceCode(storedCode);
      // setApiResponseData(exampleDeviceAddResponse); // Already set by useState
      // setResponseHttpStatus(200);
    } else {
      // setApiResponseData(exampleDeviceAddResponse); // Set example before fetching
      // setResponseHttpStatus(200);
      generateAndStoreAccessCode();
    }
  }, []); // generateAndStoreAccessCode will be part of dependencies if wrapped in useCallback

  const handleRefreshCode = () => {
    // setLocalError(null); // No longer used
    // setLocalSuccessMessage(null); // No longer used
    generateAndStoreAccessCode();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setApiResponseData(exampleDeviceAddResponse); // Show example while loading
    setResponseHttpStatus(200);
    // setLocalError(null);
    // setLocalSuccessMessage(null);
    try {
      const response = await callCubApi({
        endpoint: '/device/add',
        method: 'POST',
        body: { code: deviceCode, email: inputEmail }
      });

      setResponseHttpStatus(response.status || (response.success ? 200 : 500));
      setApiResponseData(JSON.stringify(response.data, null, 2));

      if (response.success && response.data && typeof response.data === 'object') {
        const { token: receivedToken, profile } = response.data as { token?: string; profile?: { id: number | string } };
        if (receivedToken) {
          setToken(receivedToken);
          localStorage.setItem('cub_api_token', receivedToken);
        }
        if (profile?.id) {
          setProfile(String(profile.id));
          localStorage.setItem('cub_api_profile', String(profile.id));
        }
      } else {
        // Error message is part of apiResponseData now
      }
    } catch (err: any) {
      setResponseHttpStatus(500);
      setApiResponseData(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-10 max-w-full overflow-hidden">
      <div className="text-sm text-[#999998] uppercase font-mono mb-1">#Device</div>
      <h1 className="text-3xl font-extrabold mb-2">Authorize Device</h1>
      <p className="text-base max-w-2xl text-gray-700 mb-4">
        This endpoint allows you to authorize a new device by submitting an access code.
        Upon successful authorization, a new session token is returned.
      </p>

      <div className="flex items-center space-x-2 mb-6">
        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
          POST
        </span>
        <code className="font-mono text-sm text-gray-800 px-2 py-1 bg-gray-200 rounded">/device/add</code>
      </div>

      {/* Email input removed from here */}

      <h3 className="font-bold mb-4 text-[#252425] uppercase text-sm tracking-wider">BODY PARAMS</h3>
      <div className="border border-gray-200 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-[0.8fr_0.8fr_4fr_3fr] gap-4 text-sm font-semibold text-gray-600 bg-gray-100 rounded-t-lg p-4 border-b border-gray-200">
          <div className="text-[#252425] font-bold">Name</div>
          <div>Type</div>
          <div>Description</div>
          <div className="text-right">Value</div>
        </div>
        <div className="grid grid-cols-[0.8fr_0.8fr_4fr_3fr] gap-4 text-sm text-gray-700 py-2 px-4">
          <code className="font-mono font-bold text-[#252425]">code</code>
          <span className="font-mono text-gray-600">string</span>
          <div>
            Access code obtained from the website <a href="https://cub.rip/add" target="_blank" rel="noopener noreferrer" className="underline text-[#aa566f]">cub.rip/add</a> (required).
            <button
              onClick={handleRefreshCode}
              disabled={loading}
              className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh Code
            </button>
            {generatedCode && !deviceCode && (
              <p className="mt-1 text-xs text-gray-500">Generated: <span className="font-mono">{generatedCode}</span> (auto-filled)</p>
            )}
          </div>
          <div className="text-right">
            <input
              type="text"
              id="deviceCode"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 font-mono focus:ring-indigo-500 focus:border-indigo-500"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
              placeholder="Enter access code"
              disabled={loading}
            />
          </div>
        </div>
        {/* Email row added below */}
        <div className="grid grid-cols-[0.8fr_0.8fr_4fr_3fr] gap-4 text-sm text-gray-700 py-2 px-4 border-t border-gray-100">
          <code className="font-mono font-bold text-[#252425]">email</code>
          <span className="font-mono text-gray-600">string</span>
          <div>
            Your email address.
            {userEmail && (
              <span className="ml-1 text-xs text-gray-500">(Using authenticated email. To use a different email, please log out first.)</span>
            )}
             (required)
          </div>
          <div className="text-right">
            <input
              type="email"
              id="emailInput"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 font-mono focus:ring-indigo-500 focus:border-indigo-500"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={!!userEmail || loading}
            />
          </div>
        </div>
      </div>

      <div className="rounded border border-gray-400 bg-gray-100 p-4 w-full mb-6 text-sm">
        <p className="font-semibold mb-1 text-gray-700">Authentication Note</p>
        <p className="text-xs text-gray-600">Authorization is not required for this API method (/device/add).</p>
      </div>

      <h3 className="text-xl font-bold mb-4 mt-6">RESPONSE</h3>
      <div className="border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center p-4 justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading || !deviceCode || !inputEmail}
            className="bg-[#252425] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Requesting...' : 'Request'}
          </button>
        </div>

        {apiResponseData && (
          <div className="p-4 rounded-b-lg w-full border-t border-gray-100 bg-white">
            <div className="flex items-center space-x-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold
                ${responseHttpStatus !== null && responseHttpStatus >= 200 && responseHttpStatus < 300 ? 'bg-green-200 text-green-900' :
                  (responseHttpStatus !== null && responseHttpStatus >= 400 ? 'bg-red-200 text-red-900' : 'bg-gray-200 text-gray-800')
                }
              `}>
                {responseHttpStatus !== null ? responseHttpStatus : 'N/A'}
              </span>
              <span className="font-mono text-xs text-gray-600">application/json</span>
            </div>
            <div className={`p-2 rounded overflow-x-auto
              ${responseHttpStatus !== null && responseHttpStatus >= 200 && responseHttpStatus < 300 ? 'bg-green-100' : ''}
              ${responseHttpStatus !== null && responseHttpStatus >= 400 ? 'bg-red-100' : ''}
              ${(responseHttpStatus === null || (responseHttpStatus < 200 || (responseHttpStatus >= 300 && responseHttpStatus < 400))) ? 'bg-gray-100' : ''}
            `}>
              <pre className={`whitespace-pre-wrap text-xs max-h-64 font-mono max-w-full break-all break-words overflow-y-auto language-json
                ${responseHttpStatus !== null && responseHttpStatus >= 200 && responseHttpStatus < 300 ? 'text-green-800' : ''}
                ${responseHttpStatus !== null && responseHttpStatus >= 400 ? 'text-red-800' : ''}
                ${(responseHttpStatus === null || (responseHttpStatus < 200 || (responseHttpStatus >= 300 && responseHttpStatus < 400))) ? 'text-gray-800' : ''}
              `}>
                {apiResponseData}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AccessCodePage; 