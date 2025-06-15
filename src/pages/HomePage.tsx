import React from 'react';

// Define props that will be passed from App.tsx if any are identified
// For now, the home content seems static, but this is a placeholder
interface HomePageProps {
  // Example: setCurrentPage?: (page: string) => void;
}

const HomePage: React.FC<HomePageProps> = (props) => {
  return (
    <>
      {/* Placeholder for welcome & API docs */}
      <section id="home" className="mb-10">
        <h1 className="text-3xl font-extrabold mb-2">
          Welcome to the API
        </h1>
        <p className="text-base max-w-2xl">
          CUB REST API allows you to interact with CUB
          programmatically. Use this API to build applications,
          integrations, or automation scripts. This page documents
          the REST resources available on CUB, including HTTP
          response codes and request & response examples.
        </p>
      </section>
      {/* Authentication & Authorization */}
      <section id="auth" className="mb-10">
        <h2 className="text-xl font-bold mb-2">
          Authentication & Authorization
        </h2>
        <p className="max-w-2xl">
          To access the API, you must be authenticated. Obtain an
          access token by{" "}
          <a
            href="#device-add" // This link might need to be handled by a prop function
            className="underline text-[#aa566f]"
            // onClick={() => props.setCurrentPage?.('#device-add')} // Example if prop is passed
          >
            authorizing your device
          </a>
          . The token should be sent in the{" "}
          <code className="px-1 bg-[#f4f4f4] rounded">token</code>{" "}
          header. Some API methods require the{" "}
          <code className="px-1 bg-[#f4f4f4] rounded">profile</code>{" "}
          header with your user profile ID.
        </p>
      </section>
      {/* Making Requests */}
      <section id="requests" className="mb-10">
        <h2 className="text-xl font-bold mb-2">Making Requests</h2>
        <p className="max-w-2xl">
          All API requests use the{" "}
          <code className="px-1 bg-[#f4f4f4] rounded">https</code>{" "}
          protocol (or{" "}
          <code className="px-1 bg-[#f4f4f4] rounded">http</code>),
          and should be sent to{" "}
          <code className="px-1 bg-[#f4f4f4] rounded">
            https://cub.rip/api/
          </code>
          . All responses are in JSON format.
        </p>
      </section>
      {/* Premium API */}
      <section id="premium" className="mb-10">
        <h2 className="text-xl font-bold mb-2">Premium API</h2>
        <p className="max-w-2xl">
          Some API methods require a premium account. For access,{" "}
          <a
            href="https://cub.rip/premium"
            className="underline text-[#aa566f]"
            rel="noopener noreferrer"
            target="_blank"
          >
            get premium here
          </a>
          .
        </p>
      </section>
      {/* Example Code Block */}
      <section id="example" className="mb-10">
        <h2 className="text-xl font-bold mb-2">Example Request</h2>
        <p className="max-w-2xl mb-2">
          Here is an example API call using JavaScript{" "}
          <code className="px-1 bg-[#f4f4f4] rounded">fetch</code>:
        </p>
        <pre className="rounded bg-[#252425] text-[#fbfbfb] text-sm p-4 overflow-x-auto">
          <code>{`fetch('https://cub.rip/api/bookmarks/all', {
method: 'GET',
headers: {
  'content-type': 'application/json',
  'token': 'YOUR_ACCESS_TOKEN',
  'profile': 'YOUR_PROFILE_ID'
}
})
.then(response => response.json())
.then(json => {
  console.log(json);
})
.catch(error => {
  console.error(error);
});
`}</code>
        </pre>
      </section>
      {/* VPN/Attention Warning */}
      <section id="warning" className="mb-10">
        <div className="rounded border-l-4 border-[#aa566f] bg-[#df9cb1]/20 p-4 max-w-2xl">
          <div className="font-semibold mb-1 text-[#aa566f]">
            Attention
          </div>
          <div className="text-sm text-[#252425]">
            In some countries API access may be blocked. If you have
            trouble connecting, use a VPN service or one of the
            available cub.rip mirrors.
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
