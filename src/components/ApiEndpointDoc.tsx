import React, { useState, useEffect } from "react";
import hljs from 'highlight.js';
import 'highlight.js/styles/default.css';
import { callCubApi, ApiResponse } from "../api";

interface ApiEndpointDocProps {
  title: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  queryParams?: { name: string; type: string; description: string; defaultValue?: string; options?: string[] }[];
  bodyParams?: { name: string; type: string; description: string; defaultValue?: string; options?: string[] }[];
  pathParams?: { name: string; type: string; description: string; defaultValue?: string; options?: string[] }[];
  errors?: { statusCode: number; description: string }[];
  note_title?: string;
  note_content?: React.ReactNode;
  exampleResponse: string;
  token: string;
  profile: string;
  setToken: React.Dispatch<React.SetStateAction<string>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  requiresAuth: boolean;
  dynamicEmailDefault?: string | null;
  defaultStatus?: number;
  refreshToken: () => Promise<boolean | void>;
}

const ApiEndpointDoc: React.FC<ApiEndpointDocProps> = ({
  title,
  description,
  method,
  path,
  queryParams,
  bodyParams,
  pathParams,
  errors,
  note_title,
  note_content,
  exampleResponse,
  token,
  profile,
  setToken,
  setProfile,
  requiresAuth,
  dynamicEmailDefault,
  defaultStatus,
  refreshToken,
}) => {
  const [response, setResponse] = useState<string | null>(exampleResponse);
  const [loading, setLoading] = useState<boolean>(false);
  const [bodyParamValues, setBodyParamValues] = useState<{ [key: string]: string }>({});
  const [pathParamValues, setPathParamValues] = useState<{ [key: string]: string }>({});
  const [queryParamValues, setQueryParamValues] = useState<{ [key: string]: string }>({});
  const [highlightedResponse, setHighlightedResponse] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(defaultStatus || null);
  const [retryAttempted, setRetryAttempted] = useState(false);

  useEffect(() => {
    if (bodyParams) {
      const initialValues: { [key: string]: string } = {};
      bodyParams.forEach(param => {
        initialValues[param.name] = param.defaultValue || '';
      });
      setBodyParamValues(initialValues);
    }
  }, [bodyParams]);

  useEffect(() => {
    if (pathParams) {
      const initialValues: { [key: string]: string } = {};
      pathParams.forEach(param => {
        initialValues[param.name] = param.defaultValue || '';
      });
      setPathParamValues(initialValues);
    }
  }, [pathParams]);

  useEffect(() => {
    if (queryParams) {
      const initialValues: { [key: string]: string } = {};
      queryParams.forEach(param => {
        if (param.name === 'email' && dynamicEmailDefault) {
          initialValues[param.name] = dynamicEmailDefault;
        } else {
          initialValues[param.name] = param.defaultValue || '';
        }
      });
      setQueryParamValues(initialValues);
    }
  }, [queryParams, dynamicEmailDefault]);

  useEffect(() => {
    if (response) {
      console.log('Response state updated:', response);
      try {
        const parsedJson = JSON.parse(response);
        const formattedJson = JSON.stringify(parsedJson, null, 2);
        const highlightedCode = hljs.highlight(formattedJson, {language: 'json'}).value;
        setHighlightedResponse(highlightedCode);
      } catch (e) {
        console.error("Error during highlighting:", e);
        setHighlightedResponse(response);
      }
    } else {
      setHighlightedResponse(null);
    }
  }, [response]);

  const handleBodyParamChange = (name: string, value: string) => {
    setBodyParamValues(prev => {
      const paramDefinition = bodyParams?.find(p => p.name === name);
      if (paramDefinition?.type === 'object') {
        try {
          // Attempt to parse JSON string to object
          const parsedValue = JSON.parse(value);
          return { ...prev, [name]: parsedValue };
        } catch (e) {
          // If parsing fails, store the raw string and handle error upstream (e.g., during request send)
          console.error(`Invalid JSON for ${name}:`, value);
          return { ...prev, [name]: value }; // Store invalid string for feedback
        }
      } else {
        return { ...prev, [name]: value };
      }
    });
  };

  const handlePathParamChange = (name: string, value: string) => {
    setPathParamValues(prev => ({ ...prev, [name]: value }));
  };

  const handleQueryParamChange = (name: string, value: string) => {
    setQueryParamValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSendRequest = async () => {
    setLoading(true);
    setResponse(null);
    setHttpStatus(null);
    setRetryAttempted(false);

    let constructedPath = path;
    if (pathParams) {
      pathParams.forEach(param => {
        constructedPath = constructedPath.replace(`{${param.name}}`, pathParamValues[param.name] || param.defaultValue || '');
      });
    }

    console.log('Constructed URL:', constructedPath);

    if (queryParams) {
      const queryString = new URLSearchParams();
      queryParams.forEach(param => {
        const paramValue = queryParamValues[param.name];
        if (paramValue) {
          queryString.append(param.name, paramValue);
        }
      });
      if (queryString.toString()) {
        constructedPath += `?${queryString.toString()}`;
      }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) headers['Token'] = token;
      if (profile) headers['Profile'] = profile;

      console.log('Sending request with body params:', bodyParamValues);

      let requestBody = (method !== 'GET' && bodyParams) ? { ...bodyParamValues } : undefined;

      // Special handling for /bookmarks/add to ensure 'data' is sent as JSON object
      if (path === '/bookmarks/add' && method === 'POST' && requestBody && requestBody.data) {
        // Ensure data is an object, if it's still a string (due to user error or invalid default)
        if (typeof requestBody.data === 'string') {
          try {
            requestBody.data = JSON.parse(requestBody.data);
          } catch (e) {
            console.error("Error parsing data for /bookmarks/add at send time:", e);
            setResponse(`Error: Invalid JSON for 'data' parameter: ${requestBody.data}`);
            setLoading(false);
            return;
          }
        }
      }

      let apiResponse: ApiResponse = await callCubApi({
        endpoint: constructedPath,
        method: method,
        headers: headers,
        body: requestBody,
      });

      console.log('API Response received:', apiResponse);

      if (
        !apiResponse.success &&
        (apiResponse.status === 401 || apiResponse.status === 403) &&
        !retryAttempted
      ) {
        let errorData: any = {}; // Explicitly type errorData
        try {
          if (typeof apiResponse.data === 'string') {
            errorData = JSON.parse(apiResponse.data);
          } else {
            errorData = apiResponse.data;
          }
        } catch (e) {
          console.error('Error parsing error data:', e);
        }

        if (errorData?.code === 700) { // Removed @ts-ignore, should be fine with errorData: any
          setRetryAttempted(true);
          const refreshSuccess = await refreshToken();
          if (refreshSuccess !== false) { // Check for explicit false, as void or true means success or not applicable
            // Update headers with the new token before retrying
            if (token) headers['Token'] = token; // Assuming token is updated by refreshToken via setToken

            apiResponse = await callCubApi({ // Re-assign to apiResponse
              endpoint: constructedPath,
              method: method,
              headers: headers,
              body: requestBody,
            });
            console.log('API Response after retry:', apiResponse);
          }
        }
      }

      setHttpStatus(apiResponse.status || (apiResponse.success ? 200 : 500));
      if (apiResponse.success) {
        console.log('API Success Data:', apiResponse.data);
        setResponse(JSON.stringify(apiResponse.data, null, 2));

        // Update token and profile in App.tsx if this is the device/add endpoint
        if (path === '/device/add' && apiResponse.data) {
          const data = apiResponse.data as { token?: string, profile?: { id: number | string } };
          if (data.token) {
            setToken(data.token);
          }
          if (data.profile) {
            setProfile(String(data.profile.id));
          }
        }

      } else {
        console.log('API Error Data:', apiResponse.data);
        setResponse(JSON.stringify(apiResponse.data, null, 2));
      }
    } catch (error) {
      console.error('Error during API call:', error);
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-10 max-w-full overflow-hidden">
      <div className="text-sm text-[#999998] uppercase font-mono mb-1">#{title.split(' ')[0]}</div>
      <h1 className="text-3xl font-extrabold mb-2">{title}</h1>
      <p className="text-base max-w-2xl text-gray-700 mb-4">{description}</p>

      <div className="flex items-center space-x-2 mb-6">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {method}
        </span>
        <code className="font-mono text-sm text-gray-800 px-2 py-1 bg-gray-200 rounded">{path}</code>
      </div>

      {queryParams && queryParams.length > 0 && (
        <>
          <h3 className="font-bold mb-4 text-[#252425] uppercase text-sm tracking-wider">QUERY PARAMS</h3>
          <div className="border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-[0.8fr_0.8fr_6fr_1.2fr] gap-4 text-sm font-semibold text-gray-600 bg-gray-100 rounded-t-lg p-4 border-b border-gray-200">
              <div className="text-[#252425] font-bold">Name</div>
              <div>Type</div>
              <div>Description</div>
              <div className="text-right">Value</div>
            </div>
            {queryParams.map((param, index) => (
              <div key={index} className="grid grid-cols-[0.8fr_0.8fr_6fr_1.2fr] gap-4 text-sm text-gray-700 py-2 px-4 border-b border-gray-100 last:border-b-0">
                <code className="font-mono font-bold text-[#252425]">{param.name}</code>
                <span className="font-mono text-gray-600">{param.type}</span>
                <div>
                  {param.description.includes('required') ? (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: param.description.split('required')[0] }} />
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
                        required
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: param.description.split('required')[1] }} />
                    </>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: param.description }} />
                  )}
                  {param.options && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {param.options.map((option, optIndex) => (
                        <span key={optIndex} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs cursor-pointer hover:bg-gray-200">
                          {option}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <input
                    type={param.type === 'integer' ? 'number' : 'text'}
                    value={queryParamValues[param.name] || ''}
                    onChange={(e) => handleQueryParamChange(param.name, e.target.value)}
                    className="w-full max-w-[200px] px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 font-mono focus:ring-green-500 focus:border-green-500"
                    placeholder={param.defaultValue}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {bodyParams && bodyParams.length > 0 && (
        <>
          <h3 className="font-bold mb-4 text-[#252425] uppercase text-sm tracking-wider">BODY PARAMS</h3>
          <div className="border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-[0.8fr_0.8fr_6fr_1.2fr] gap-4 text-sm font-semibold text-gray-600 bg-gray-100 rounded-t-lg p-4 border-b border-gray-200">
              <div className="text-[#252425] font-bold">Name</div>
              <div>Type</div>
              <div>Description</div>
              <div className="text-right">Value</div>
            </div>
            {bodyParams.map((param, index) => (
              <div key={index} className="grid grid-cols-[0.8fr_0.8fr_6fr_1.2fr] gap-4 text-sm text-gray-700 py-2 px-4 border-b border-gray-100 last:border-b-0">
                <code className="font-mono font-bold text-[#252425]">{param.name}</code>
                <span className="font-mono text-gray-600">{param.type}</span>
                <div>
                  {param.description.includes('required') ? (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: param.description.split('required')[0] }} />
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
                        required
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: param.description.split('required')[1] }} />
                    </>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: param.description }} />
                  )}
                  {param.options && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {param.options.map((option, optIndex) => (
                        <span key={optIndex} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs cursor-pointer hover:bg-gray-200">
                          {option}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <input
                    type={param.type === 'integer' ? 'number' : 'text'}
                    value={bodyParamValues[param.name] || ''}
                    onChange={(e) => handleBodyParamChange(param.name, e.target.value)}
                    className="w-full max-w-[200px] px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 font-mono focus:ring-green-500 focus:border-green-500"
                    placeholder={param.defaultValue}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pathParams && pathParams.length > 0 && (
        <>
          <h3 className="font-bold mb-4 text-[#252425] uppercase text-sm tracking-wider">PATH PARAMS</h3>
          <div className="border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-[0.8fr_0.8fr_6fr_1.2fr] gap-4 text-sm font-semibold text-gray-600 bg-gray-100 rounded-t-lg p-4 border-b border-gray-200">
              <div className="text-[#252425] font-bold">Name</div>
              <div>Type</div>
              <div>Description</div>
              <div className="text-right">Value</div>
            </div>
            {pathParams.map((param, index) => (
              <div key={index} className="grid grid-cols-[0.8fr_0.8fr_6fr_1.2fr] gap-4 text-sm text-gray-700 py-2 px-4 border-b border-gray-100 last:border-b-0">
                <code className="font-mono font-bold text-[#252425]">{param.name}</code>
                <span className="font-mono text-gray-600">{param.type}</span>
                <div>
                  {param.description.includes('required') ? (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: param.description.split('required')[0] }} />
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
                        required
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: param.description.split('required')[1] }} />
                    </>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: param.description }} />
                  )}
                  {param.options && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {param.options.map((option, optIndex) => (
                        <span key={optIndex} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs cursor-pointer hover:bg-gray-200">
                          {option}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <input
                    type={param.type === 'integer' ? 'number' : 'text'}
                    value={pathParamValues[param.name] || ''}
                    onChange={(e) => handlePathParamChange(param.name, e.target.value)}
                    className="w-full max-w-[200px] px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 font-mono focus:ring-green-500 focus:border-green-500"
                    placeholder={param.defaultValue}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {errors && errors.length > 0 && (
        <>
          <h3 className="font-bold mb-4 text-[#252425] uppercase text-sm tracking-wider">ERRORS</h3>
          <div className="border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-[auto_0.8fr_1fr] gap-4 text-sm font-semibold text-gray-600 bg-gray-100 rounded-t-lg p-4 border-b border-gray-200">
              <div className="text-[#252425] font-bold">Status Code</div>
              <div></div>
              <div className="text-left">Description</div>
            </div>
            {errors.map((error, index) => (
              <div key={index} className="grid grid-cols-[auto_0.8fr_1fr] gap-4 text-sm text-gray-700 py-2 px-4 border-b border-gray-100 last:border-b-0">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-red-200 text-red-800">{error.statusCode}</span>
                <div></div>
                <div className="text-left">{error.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {note_title && note_content && (
        <div className="rounded border border-[rgb(123,121,255)] bg-[rgb(238,237,255)] p-4 w-full mb-6">
          <p className="text-sm mb-1 text-[rgb(74,74,106)]">{note_title}</p>
          <p className="text-xs text-[rgb(74,74,106)]">{note_content}</p>
        </div>
      )}

      <h3 className="text-xl font-bold mb-4 mt-6">RESPONSE</h3>
      <div className="border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center p-4 justify-between">
          {requiresAuth ? (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-800">TOKEN</span>
              <input
                id="token-input"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-[600px] px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:ring-green-500 focus:border-green-500"
                placeholder="YOUR_ACCESS_TOKEN"
              />
              <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-800">PROFILE</span>
              <input
                id="profile-input"
                type="text"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="w-[170px] w-24 px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:ring-green-500 focus:border-green-500"
                placeholder="YOUR_PROFILE_ID"
              />
            </div>
          ) : (
            <span className="text-sm text-gray-600">Authorization is not required for this API method.</span>
          )}
          <button
            onClick={handleSendRequest}
            disabled={loading}
            className="bg-[#252425] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>

        {response && (
          <div className="p-4 rounded-b-lg w-full border-t border-gray-100 bg-white">
            <div className="flex items-center space-x-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold
                ${httpStatus !== null && httpStatus >= 200 && httpStatus < 300 ? 'bg-green-200 text-green-900' :
                  (httpStatus !== null && httpStatus >= 400 ? 'bg-red-200 text-red-900' : 'bg-gray-200 text-gray-800')
                }
              `}>
                {httpStatus}
              </span>
              <span className="font-mono text-xs text-gray-600">application/json</span>
            </div>
            <div className={`p-2 rounded overflow-x-auto 
              ${httpStatus !== null && httpStatus >= 200 && httpStatus < 300 ? 'bg-green-100' : ''}
              ${httpStatus !== null && httpStatus >= 400 ? 'bg-red-100' : ''}
              ${(httpStatus === null || (httpStatus < 200 || (httpStatus >= 300 && httpStatus < 400))) ? 'bg-gray-100' : ''}
            `}>
              <pre className={`whitespace-pre-wrap text-xs max-h-64 font-mono max-w-full break-all break-words overflow-y-auto language-json
                ${httpStatus !== null && httpStatus >= 200 && httpStatus < 300 ? 'text-green-800' : ''}
                ${httpStatus !== null && httpStatus >= 400 ? 'text-red-800' : ''}
                ${(httpStatus === null || (httpStatus < 200 || (httpStatus >= 300 && httpStatus < 400))) ? 'text-gray-800' : ''}
              `}
                dangerouslySetInnerHTML={{ __html: highlightedResponse || '' }}>
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ApiEndpointDoc; 