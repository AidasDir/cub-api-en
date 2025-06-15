import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface ProfilesActivePageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const ProfilesActivePage: React.FC<ProfilesActivePageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Profiles Active"
      description="Sets the active profile for the authenticated user."
      method="POST"
      path="/profiles/active"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "The ID of the profile to set as active.",
        },
      ]}
      note_title="Authentication Required"
      note_content="This API method requires user authentication."
      exampleResponse={JSON.stringify(
        {
          success: true,
          message: "Active profile updated successfully.",
        },
        null,
        2,
      )}
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

export default ProfilesActivePage;
