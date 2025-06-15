import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface NotificationsAllPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void; // For internal navigation links
}

const NotificationsAllPage: React.FC<NotificationsAllPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Notifications All"
      description="Retrieve all notifications for the authenticated user."
      method="GET"
      path="/notifications/all"
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
      exampleResponse={JSON.stringify([], null, 2)}
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

export default NotificationsAllPage;
