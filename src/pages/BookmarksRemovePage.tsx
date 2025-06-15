import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface BookmarksRemovePageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const BookmarksRemovePage: React.FC<BookmarksRemovePageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Bookmarks Remove"
      description="Remove an existing bookmark."
      method="POST"
      path="/bookmarks/remove"
      bodyParams={[
        {
          name: "id",
          type: "integer",
          description: "ID of the entry.",
          defaultValue: "9938938",
        },
        {
          name: "list",
          type: "array",
          description:
            "Or a list of entry IDs (e.g., [455, 333, 7854, 3222...]).",
          defaultValue: "[455,333]",
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
      errors={[
        {
          statusCode: 300,
          description: "Error in data",
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

export default BookmarksRemovePage;
