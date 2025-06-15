import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface CardSubscribedPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const CardSubscribedPage: React.FC<CardSubscribedPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Card Subscribed"
      description="Check if the authenticated user is subscribed to premium."
      method="POST"
      path="/card/subscribed"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "ID of the card (required).",
          defaultValue: "95396",
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
        { subscribed: true },
        null,
        2,
      )}
      errors={[
        {
          statusCode: 466,
          description: "No subscriptions",
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

export default CardSubscribedPage;
