import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface UsersGetPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const UsersGetPage: React.FC<UsersGetPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Users Get"
      description="Get information about the authenticated user."
      method="GET"
      path="/users/get"
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
          user: {
            id: 1,
            email: "dummy@example.com",
            profile: 1,
            telegram_id: 0,
            telegram_chat: 0,
            n_movie: 1,
            n_tv: 1,
            n_voice: 1,
            premium: 0,
            backup: 0,
            permission: 0,
            bet: "",
            payout: 0,
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

export default UsersGetPage;
