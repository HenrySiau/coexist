const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const docusign = require('docusign-esign')


// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.contractId;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  const snapshot = await admin.database().ref('/messages').push({
    contractId: contractId,
    status: 'success'
  });
  // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
  res.redirect(303, snapshot.ref.toString());
});

// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
    .onCreate((snapshot, context) => {
      // Grab the current value of what was written to the Realtime Database.
      const original = snapshot.val();
      const uppercase = original.toUpperCase();
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to the Firebase Realtime Database.
      // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
      return snapshot.ref.parent.child('uppercase').set(uppercase);
    });

///////////////////////////////////////
///////////////////////////////////////

const express = require('express');
const cors = require('cors');
var bodyParser = require('body-parser')

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
app.use(bodyParser.json());

app.post('/sign2/', async(req, res) => {
  const data = req.body
  if( data.contractId && data.content ) {
    const snapshot = await admin.database().ref('/contracts').push({
      contractId: data.contractId,
      content: data.content
    });
    return res.send( {url: snapshot.ref.toString() })
  }

  return res.send( { error: 'contractId and content required', data: data, content: data["content"] })

} )

// build multiple CRUD interfaces:
app.get('/signed/:id', async (req, res) => {
  if ( req.params.id ) {
    const snapshot = await admin.database().ref('/contracts/signed').push({
      contractId: req.params.id,
    });
  // res.redirect( snapshot.ref.toString() );
  res.send('Thank you! You have successfully signed.');

  }

  res.send('No contract ID received');
} )

app.post('/sign/', async(req, res) => {
  try{
    const data = req.body
    if( data.contractId && data.content ) {
      const snapshot = await admin.database().ref('/contracts').push({
        contractId: data.contractId,
        content: data.content
      });
    }

  const basePath = 'https://demo.docusign.net/restapi'
  let redirectBaseUrl = 'https://us-central1-coexist-703de.cloudfunctions.net/docusign/signed/'
  const accessToken =  'eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNjgxODVmZjEtNGU1MS00Y2U5LWFmMWMtNjg5ODEyMjAzMzE3In0.AQkAAAABAAUABwAAXyz-9OzWSAgAAJ9PDDjt1kgCAMHGtOsRDflEsXLU5VEUJmwVAAEAAAAYAAkAAAAFAAAAKwAAAC0AAAAvAAAAMQAAADIAAAA4AAAAMwAAADUAAAANACQAAABmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgwAACS1db07NZINwADd9R5ba_OTrDXEspTrdIB.XVI5Cv2_8emIO1MqadCAe0gNBugoZmLjgFi1xafr0mj1zh64gt_Vf4G2Zc34jnBMjCAI0-Dget9tlWLnZJxmrZXA0-HCtA_QXzXhAwDtyPlcGoP_okRIVD2SzpFlnMWppjxTmSyxALcIUD_d14oW6KwqY6YTRmErF8KUYtN6_J6_1YIcv12QBncMtzEWXQcxMLCnWwh8AEjebFILVgwNB7xv2jHkFdiGisdnckcUlZiZhJRmNaKSCG2VZdaBWGfWPSCqXk7St5dD4rgdmpwYshjMJz0Nh4vJtfZA-J_EZAOB3568poXmzrtuXoTKmb4l7ECE_HnEGJya374JcjKLCw';

  const accountId =  '8502917';
  const signerName =  'Nick Fury';
  const signerEmail =  'nickfury@marvel.com';
  const clientUserId = '123'
  const authenticationMethod = 'None'

  /**
   *  Step 1. The envelope definition is created.
   *          One signHere tab is added.
   *          The document path supplied is relative to the working directory
   */
  const envDef = new docusign.EnvelopeDefinition();
  //Set the Email Subject line and email message
  envDef.emailSubject = 'Please sign this document sent from the Node example';
  envDef.emailBlurb = 'Please sign this document sent from the Node example.'

  const contractText = data.content || 'Agreement...'
  const docBase64 = Buffer.from(contractText).toString('base64')
  const doc = docusign.Document.constructFromObject({documentBase64: docBase64,
    fileExtension: 'TXT',  
    name: 'Sample document', documentId: '1'});
  envDef.documents = [ doc ];

  // Create the signer object with the previously provided name / email address
  const signer = docusign.Signer.constructFromObject({name: signerName, email: signerEmail,
          routingOrder: '1', recipientId: '1', clientUserId: clientUserId});

  // Create the signHere tab to be placed on the envelope
  const signHere = docusign.SignHere.constructFromObject({documentId: '1',
          pageNumber: '1', recipientId: '1', tabLabel: 'SignHereTab',
          xPosition: '195', yPosition: '147'});

  // Create the overall tabs object for the signer and add the signHere tabs array
  // Note that tabs are relative to receipients/signers.
  signer.tabs = docusign.Tabs.constructFromObject({signHereTabs: [signHere]});

  // Add the recipients object to the envelope definition.
  // It includes an array of the signer objects.
  envDef.recipients = docusign.Recipients.constructFromObject({signers: [signer]});
  // Set the Envelope status. For drafts, use 'created' To send the envelope right away, use 'sent'
  envDef.status = 'sent';


  /**
   *  Step 2. Create/send the envelope.
   *          We're using a promise version of the SDK's createEnvelope method.
   */
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(basePath);
  apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  // Set the DocuSign SDK components to use the apiClient object
  docusign.Configuration.default.setDefaultApiClient(apiClient);
  let envelopesApi = new docusign.EnvelopesApi()
    , results;
    try {
      results = await envelopesApi.createEnvelope(accountId, {'envelopeDefinition': envDef})


      /**
       * Step 3. The envelope has been created.
       *         Request a Recipient View URL (the Signing Ceremony URL)
       */
      const envelopeId = results.envelopeId
          , recipientViewRequest = docusign.RecipientViewRequest.constructFromObject({
              authenticationMethod: authenticationMethod, clientUserId: clientUserId,
              recipientId: '1', returnUrl: redirectBaseUrl + data.contractId,
              userName: signerName, email: signerEmail
            })
          ;
  
      results = await envelopesApi.createRecipientView(accountId, envelopeId,
                        {recipientViewRequest: recipientViewRequest});
      /**
       * Step 4. The Recipient View URL (the Signing Ceremony URL) has been received.
       *         Redirect the user's browser to it.
       */

      return res.send({url: results.url})
    } catch  (e) {
      // Handle exceptions
      let body = e.response && e.response.body;
      if (body) {
        // DocuSign API exception
        return res.send({ err: `<html lang="en"><body>
                    <h3>API problem</h3><p>Status code ${e.response.status}</p>
                    <p>Error message:</p><p><pre><code>${JSON.stringify(body, null, 4)}</code></pre></p>`});
      } else {
        // Not a DocuSign exception
        throw e;
      }
    }

  } catch (err ) {
    return res.send({ errorFromHere: err})
  }

} );

/////////////////
////////////////
///////////////
/// mock

app.get('/doc/sign/', async(req, res) => {
  try{
  const basePath = 'https://demo.docusign.net/restapi'
  let redirectBaseUrl = 'https://us-central1-coexist-703de.cloudfunctions.net/docusign/signed/'
  const accessToken =  'eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNjgxODVmZjEtNGU1MS00Y2U5LWFmMWMtNjg5ODEyMjAzMzE3In0.AQkAAAABAAUABwAAXyz-9OzWSAgAAJ9PDDjt1kgCAMHGtOsRDflEsXLU5VEUJmwVAAEAAAAYAAkAAAAFAAAAKwAAAC0AAAAvAAAAMQAAADIAAAA4AAAAMwAAADUAAAANACQAAABmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgwAACS1db07NZINwADd9R5ba_OTrDXEspTrdIB.XVI5Cv2_8emIO1MqadCAe0gNBugoZmLjgFi1xafr0mj1zh64gt_Vf4G2Zc34jnBMjCAI0-Dget9tlWLnZJxmrZXA0-HCtA_QXzXhAwDtyPlcGoP_okRIVD2SzpFlnMWppjxTmSyxALcIUD_d14oW6KwqY6YTRmErF8KUYtN6_J6_1YIcv12QBncMtzEWXQcxMLCnWwh8AEjebFILVgwNB7xv2jHkFdiGisdnckcUlZiZhJRmNaKSCG2VZdaBWGfWPSCqXk7St5dD4rgdmpwYshjMJz0Nh4vJtfZA-J_EZAOB3568poXmzrtuXoTKmb4l7ECE_HnEGJya374JcjKLCw';

  const accountId =  '8502917';
  const signerName =  'Dmitry Dolgopolov';
  const signerEmail =  'Dmitry@samplemail.com';
  const clientUserId = '123'
  const authenticationMethod = 'None'

  /**
   *  Step 1. The envelope definition is created.
   *          One signHere tab is added.
   *          The document path supplied is relative to the working directory
   */
  const envDef = new docusign.EnvelopeDefinition();
  //Set the Email Subject line and email message
  envDef.emailSubject = 'Please sign this document sent from the Node example';
  envDef.emailBlurb = 'Please sign this document sent from the Node example.'

  const contractText = "Roommate Agreement\nAddress: 123 Main Street, San Francisco \n\nExpenses\n - Deidre will pay rent of $1,000 on the 1st day of each month.\n - Silvia will pay rent of $1,200 on the 1st day of each month.\n - Dmitry will pay rent of $1,500 on the 1st day of each month.\n \nTasks\n - Deidre will take out the trash once a week.\n - Silvia will clean the bathroom twice a week.\n - Dmitry will clean the kitchen once a week."
  const docBase64 = Buffer.from(contractText).toString('base64')
  const doc = docusign.Document.constructFromObject({documentBase64: docBase64,
    fileExtension: 'TXT',  
    name: 'Sample document', documentId: '1'});
  envDef.documents = [ doc ];

  // Create the signer object with the previously provided name / email address
  const signer = docusign.Signer.constructFromObject({name: signerName, email: signerEmail,
          routingOrder: '1', recipientId: '1', clientUserId: clientUserId});

  // Create the signHere tab to be placed on the envelope
  const signHere = docusign.SignHere.constructFromObject({documentId: '1',
          pageNumber: '1', recipientId: '1', tabLabel: 'SignHereTab',
          xPosition: '195', yPosition: '250'});

  // Create the overall tabs object for the signer and add the signHere tabs array
  // Note that tabs are relative to receipients/signers.
  signer.tabs = docusign.Tabs.constructFromObject({signHereTabs: [signHere]});

  // Add the recipients object to the envelope definition.
  // It includes an array of the signer objects.
  envDef.recipients = docusign.Recipients.constructFromObject({signers: [signer]});
  // Set the Envelope status. For drafts, use 'created' To send the envelope right away, use 'sent'
  envDef.status = 'sent';


  /**
   *  Step 2. Create/send the envelope.
   *          We're using a promise version of the SDK's createEnvelope method.
   */
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(basePath);
  apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  // Set the DocuSign SDK components to use the apiClient object
  docusign.Configuration.default.setDefaultApiClient(apiClient);
  let envelopesApi = new docusign.EnvelopesApi()
    , results;
    try {
      results = await envelopesApi.createEnvelope(accountId, {'envelopeDefinition': envDef})


      /**
       * Step 3. The envelope has been created.
       *         Request a Recipient View URL (the Signing Ceremony URL)
       */
      const envelopeId = results.envelopeId
          , recipientViewRequest = docusign.RecipientViewRequest.constructFromObject({
              authenticationMethod: authenticationMethod, clientUserId: clientUserId,
              recipientId: '1', returnUrl: redirectBaseUrl + 'docIdkk98dks887jk',
              userName: signerName, email: signerEmail
            })
          ;
  
      results = await envelopesApi.createRecipientView(accountId, envelopeId,
                        {recipientViewRequest: recipientViewRequest});
      /**
       * Step 4. The Recipient View URL (the Signing Ceremony URL) has been received.
       *         Redirect the user's browser to it.
       */

      return res.redirect(results.url)
    } catch  (e) {
      // Handle exceptions
      let body = e.response && e.response.body;
      if (body) {
        // DocuSign API exception
        return res.send({ err: `<html lang="en"><body>
                    <h3>API problem</h3><p>Status code ${e.response.status}</p>
                    <p>Error message:</p><p><pre><code>${JSON.stringify(body, null, 4)}</code></pre></p>`});
      } else {
        // Not a DocuSign exception
        throw e;
      }
    }

  } catch (err ) {
    return res.send({ errorFromHere: err})
  }

} );

// Expose Express API as a single Cloud Function:
exports.docusign = functions.https.onRequest(app);
