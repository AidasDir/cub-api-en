import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface ReactionsAddPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const ReactionsAddPage: React.FC<ReactionsAddPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Reactions Add"
      description="Adds a reaction to content."
      method="GET"
      path="/reactions/add/{content_id}/{type}"
      pathParams={[
        {
          name: "content_id",
          type: "string",
          description: "The ID of the content to react to.",
          defaultValue: "tv_125988",
        },
        {
          name: "type",
          type: "string",
          description: "The type of reaction.",
          options: ["like", "dislike", "fire", "heart"],
          defaultValue: "like",
        },
      ]}
      note_title="Authentication Required"
      note_content="This API method requires user authentication."
      exampleResponse={JSON.stringify({ secuses: true }, null, 2)}
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

export default ReactionsAddPage;
