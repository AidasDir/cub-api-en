import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface UsersFindPageProps {
  token: string;
  profile: string;
  userEmail: string | null; // For dynamicEmailDefault
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const UsersFindPage: React.FC<UsersFindPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Users Find"
      description="Find a user by email address."
      method="GET"
      path="/users/find"
      queryParams={[
        {
          name: "email",
          type: "string",
          description: "User email (required).",
          defaultValue: "test@example.com",
        },
      ]}
      errors={[
        {
          statusCode: 400,
          description: "Email cannot be empty.",
        },
        {
          statusCode: 300,
          description: "User not found.",
        },
      ]}
      note_title="Authorization is not required for this API method."
      note_content="" // Empty content for no authentication
      exampleResponse={JSON.stringify(
        { id: "user_id", email: "example@email.com" },
        null,
        2,
      )}
      token={props.token}
      profile={props.profile}
      setToken={props.setToken}
      setProfile={props.setProfile}
      requiresAuth={false} // This specific endpoint does not require auth
      dynamicEmailDefault={props.userEmail} // Pass userEmail
      defaultStatus={200}
      refreshToken={props.generateAndSetCustomToken}
    />
  );
};

export default UsersFindPage;
