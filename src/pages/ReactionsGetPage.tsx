import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface ReactionsGetPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const ReactionsGetPage: React.FC<ReactionsGetPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Reactions Get"
      description="Get reactions for specific content."
      method="GET"
      path="/reactions/get/{id}"
      pathParams={[
        {
          name: "id",
          type: "string",
          description:
            'Type + card ID, e.g., <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs cursor-pointer hover:bg-gray-200">movie_id</span> | <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs cursor-pointer hover:bg-gray-200">tv_id</span>.',
          defaultValue: "tv_125988",
        },
      ]}
      note_title="Authorization is not required for this API method."
      note_content=""
      exampleResponse={JSON.stringify(
        {
          secuses: true,
          result: [
            {
              card_id: "tv_125988",
              type: "think",
              counter: 416,
            },
            {
              card_id: "tv_125988",
              type: "nice",
              counter: 1434,
            },
            {
              card_id: "tv_125988",
              type: "fire",
              counter: 6000,
            },
            {
              card_id: "tv_125988",
              type: "bore",
              counter: 304,
            },
            {
              card_id: "tv_125988",
              type: "shit",
              counter: 352,
            },
          ],
        },
        null,
        2,
      )}
      token={props.token}
      profile={props.profile}
      setToken={props.setToken}
      setProfile={props.setProfile}
      requiresAuth={false} // This specific endpoint does not require auth
      defaultStatus={200}
      refreshToken={props.generateAndSetCustomToken}
    />
  );
};

export default ReactionsGetPage;
