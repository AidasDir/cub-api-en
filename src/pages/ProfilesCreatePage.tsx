import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface ProfilesCreatePageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const ProfilesCreatePage: React.FC<ProfilesCreatePageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Profiles Create"
      description="Create a new profile."
      method="POST"
      path="/profiles/create"
      bodyParams={[
        {
          name: "name",
          type: "string",
          description: "Name of the profile (required).",
          defaultValue: "",
        },
      ]}
      errors={[
        {
          statusCode: 300,
          description: "Error in data.",
        },
        {
          statusCode: 400,
          description: "Maximum number of profiles created.",
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
      exampleResponse={JSON.stringify(
        {
          secuses: true,
          profile: {
            id: 537503,
            cid: 520688,
            name: "DEMO",
          },
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

export default ProfilesCreatePage;
