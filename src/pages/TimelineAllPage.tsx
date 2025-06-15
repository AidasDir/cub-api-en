import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface TimelineAllPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const TimelineAllPage: React.FC<TimelineAllPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Timeline All"
      description="Returns the user's timeline data."
      method="GET"
      path="/timeline/all"
      queryParams={[
        {
          name: "full",
          type: "boolean",
          description:
            "Returns the entire timeline. Defaults to false.",
          defaultValue: "false",
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
          timelines: {},
        },
        null,
        2,
      )}
      errors={[
        {
          statusCode: 500,
          description: "Internal server error.",
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

export default TimelineAllPage;
