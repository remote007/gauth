// import React, { useEffect, useState } from 'react';
// import { gapi } from 'gapi-script';
// import axios from 'axios';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

// const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
// const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// function App() {
//   const [isSignedIn, setIsSignedIn] = useState(false);

//   useEffect(() => {
//     const initClient = () => {
//       gapi.client
//         .init({
//           clientId: CLIENT_ID,
//           scope: SCOPES,
//         })
//         .then(() => {
//           const auth = gapi.auth2.getAuthInstance();
//           setIsSignedIn(auth.isSignedIn.get());
//           auth.isSignedIn.listen(setIsSignedIn);
//           if (auth.isSignedIn.get()) {
//             loadEmails();
//           }
//         })
//         .catch(err => console.error('Init error:', err));
//     };

//     gapi.load('client:auth2', initClient);
//   }, []);

//   const handleLogin = () => {
//     const auth = gapi.auth2.getAuthInstance();
//     auth.signIn().then(() => {
//       setIsSignedIn(true);
//       loadEmails();
//     });
//   };

//   const handleLogout = () => {
//     const auth = gapi.auth2.getAuthInstance();
//     auth.signOut().then(() => {
//       setIsSignedIn(false);
//     });
//   };

//   const loadEmails = async () => {
//     try {
//       await gapi.client.load('gmail', 'v1');

//       const res = await gapi.client.gmail.users.messages.list({
//         userId: 'me',
//         maxResults: 5,
//       });

//       if (!res.result.messages) return;

//       const messagePromises = res.result.messages.map(msg =>
//         gapi.client.gmail.users.messages.get({
//           userId: 'me',
//           id: msg.id,
//         })
//       );

//       const messages = await Promise.all(messagePromises);

//       const emailData = messages.map(({ result }) => {
//         const subjectHeader = result.payload.headers.find(
//           h => h.name === 'Subject'
//         );
//         return {
//           id: result.id,
//           snippet: result.snippet,
//           subject: subjectHeader?.value || '(No Subject)',
//         };
//       });

//       // Send to backend
//       await axios.post('http://localhost:8083/emails', emailData, {
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//     } catch (error) {
//       console.error('Error loading emails:', error);
//     }
//   };

//   return (
//     <div style={{
//       padding: 40,
//       fontFamily: 'Arial, sans-serif',
//       textAlign: 'center',
//       background: '#f5f6fa',
//       minHeight: '100vh'
//     }}>
//       {/* WhatsApp clickable icon */}
//       <a
//         href="https://wa.me/919999999999?text=Hello%20there!"
//         target="_blank"
//         rel="noopener noreferrer"
//         style={{
//           display: 'inline-block',
//           textDecoration: 'none',
//           marginBottom: 20
//         }}
//       >
//         <FontAwesomeIcon icon={faWhatsapp} size="4x" color="#25D366" />
//       </a>

//       <h1 style={{ color: '#2f3640', fontSize: '2.5rem' }}>Gmail Auth Demo</h1>

//       {isSignedIn ? (
//         <button
//           onClick={handleLogout}
//           style={{
//             backgroundColor: '#ff4d4f',
//             border: 'none',
//             color: '#fff',
//             padding: '12px 24px',
//             fontSize: '1rem',
//             borderRadius: '8px',
//             cursor: 'pointer',
//             marginTop: '20px',
//           }}
//         >
//           Logout
//         </button>
//       ) : (
//         <button
//           onClick={handleLogin}
//           style={{
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             backgroundColor: '#ffffff',
//             color: '#000000',
//             fontSize: '1rem',
//             border: '1px solid #dadce0',
//             padding: '12px 20px',
//             borderRadius: '8px',
//             cursor: 'pointer',
//             boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
//             gap: '10px',
//             marginTop: '20px'
//           }}
//         >
//           <img
//             src="https://developers.google.com/identity/images/g-logo.png"
//             alt="Google logo"
//             style={{ width: 20, height: 20 }}
//           />
//           Sign in with Google
//         </button>
//       )}
//     </div>
//   );
// }

// export default App;


import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import LeadsDashboard from './components/LeadsDashboard.jsx';

function App() {
  return (
    <div>
      <LeadsDashboard />
    </div>
  );
}

export default App;
