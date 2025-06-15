import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface NotificationsStatusPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const NotificationsStatusPage: React.FC<NotificationsStatusPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Notifications Status"
      description="Set the notification status for a specific entry."
      method="POST"
      path="/notifications/status"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "Notification ID (required).",
          defaultValue: "18",
        },
        {
          name: "status",
          type: "integer",
          description:
            "Status (0 or 1, required). 0 means disabled, 1 means enabled.",
          defaultValue: "1",
          options: ["0", "1"],
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
        { enabled: true, unread_count: 5 },
        null,
        2,
      )}
      errors={[
        {
          statusCode: 400,
          description:
            "Notification ID and a valid status (0 or 1) are required.",
        },
        {
          statusCode: 404,
          description:
            "Notification not found or not authorized for this user/profile.",
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

export default NotificationsStatusPage;
