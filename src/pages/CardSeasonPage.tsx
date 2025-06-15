import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface CardSeasonPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const CardSeasonPage: React.FC<CardSeasonPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Card Season"
      description="Retrieve information about the current season."
      method="POST"
      path="/card/season"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "Card ID required",
          defaultValue: "95396",
        },
        {
          name: "original_name",
          type: "string",
          description:
            "Original card name, used to generate time-code hash required",
          defaultValue: "Severance",
        },
        {
          name: "season",
          type: "integer",
          description: "Season number required",
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
        { season: "Spring 2025" },
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

export default CardSeasonPage;
