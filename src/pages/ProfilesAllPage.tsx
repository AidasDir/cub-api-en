import React from 'react';
import ApiEndpointDoc from '../components/ApiEndpointDoc';

interface ProfilesAllPageProps {
  token: string;
  profile: string;
  setToken: (value: string | ((prev: string) => string)) => void;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  generateAndSetCustomToken: () => Promise<void>;
  // setCurrentPage: (page: string) => void;
}

const ProfilesAllPage: React.FC<ProfilesAllPageProps> = (props) => {
  return (
    <ApiEndpointDoc
      title="Profiles All"
      description="Retrieve all profiles for the authenticated user."
      method="GET"
      path="/profiles/all"
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
          profiles: [
            {
              id: 536380,
              cid: 520688,
              name: "Общий",
              main: 1,
              icon: "l_1",
            },
            {
              id: 536831,
              cid: 520688,
              name: "New Name",
              main: 0,
              icon: "l_1",
            },
            {
              id: 536880,
              cid: 520688,
              name: "New Profile Name",
              main: 0,
              icon: "l_1",
            },
          ],
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

export default ProfilesAllPage;
