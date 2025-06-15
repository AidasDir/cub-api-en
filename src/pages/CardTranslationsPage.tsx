import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface CardTranslationsPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const CardTranslationsPage: React.FC<CardTranslationsPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Card Translations"
      description="Retrieve card translations."
      method="POST"
      path="/card/translations"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "ID of the card (required).",
          defaultValue: "95396",
        },
        {
          name: "season",
          type: "integer",
          description: "Season number (required).",
          defaultValue: "1",
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
        { lang: "en", title: "Title" },
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

export default CardTranslationsPage;
