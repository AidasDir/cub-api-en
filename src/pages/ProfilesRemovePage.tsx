import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface ProfilesRemovePageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const ProfilesRemovePage: React.FC<ProfilesRemovePageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Profiles Remove"
      description="Removes a user profile by ID."
      method="POST"
      path="/profiles/remove"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "The ID of the profile to remove.",
        },
      ]}
      exampleResponse={JSON.stringify(
        { success: true, message: "Profile removed successfully." },
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

export default ProfilesRemovePage;
