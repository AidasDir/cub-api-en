import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface UsersGivePageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const UsersGivePage: React.FC<UsersGivePageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Users Give"
      description="Gift CUB Premium subscription to another user."
      method="POST"
      path="/users/give"
      bodyParams={[
        {
          name: "to",
          type: "integer",
          description: "ID of the user to gift (required).",
          defaultValue: "1",
        },
        {
          name: "days",
          type: "integer",
          description:
            'Number of days, minimum <span class="px-1 bg-[rgb(238,237,255)] text-[rgb(123,121,255)] rounded">5 days</span> (required).',
          defaultValue: "30",
        },
        {
          name: "password",
          type: "string",
          description: "Your password for confirmation (required).",
          defaultValue: "password",
        },
      ]}
      errors={[
        {
          statusCode: 455,
          description: "Cannot gift to yourself.",
        },
        {
          statusCode: 456,
          description: "You do not have CUB Premium.",
        },
        {
          statusCode: 457,
          description: "Password does not match.",
        },
        {
          statusCode: 458,
          description: "Insufficient CUB Premium days.",
        },
        {
          statusCode: 459,
          description: "User not found.",
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

export default UsersGivePage;
