import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface BookmarksAllPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void; // Matched App.tsx's setTokenAndCookie
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void; // Added for navigation links within ApiEndpointDoc
}

const BookmarksAllPage: React.FC<BookmarksAllPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Bookmarks All"
      description="Returns the user's list of bookmarks."
      method="GET"
      path="/bookmarks/all"
      queryParams={[
        {
          name: "full",
          type: "integer",
          description:
            "Returns the entire list. By default, unique cards without history are returned.",
          defaultValue: "0",
        },
        {
          name: "type",
          type: "string",
          description: "Bookmark type.",
          defaultValue: "book",
          options: ["book", "history", "like", "wath"],
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
        [
          {
            type: "like",
            count: 7,
          },
          {
            type: "wath",
            count: 6,
          },
        ],
        null,
        2,
      )}
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

export default BookmarksAllPage;
