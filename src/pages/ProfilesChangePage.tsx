import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface ProfilesChangePageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const ProfilesChangePage: React.FC<ProfilesChangePageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Profiles Change"
      description="Change an existing profile."
      method="POST"
      path="/profiles/change"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "ID of the profile to change (required).",
          defaultValue: "0",
        },
        {
          name: "name",
          type: "string",
          description: "New name for the profile (required).",
          defaultValue: "New Name",
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

export default ProfilesChangePage;
