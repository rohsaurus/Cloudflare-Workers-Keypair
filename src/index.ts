import * as Realm from 'realm-web';
import * as utils from './utils';

// The Worker's environment bindings. See `wrangler.toml` file.
interface Bindings {
    // MongoDB Realm Application ID
    REALM_APPID: string;
}
console.log("Hello, does this work?");
// Define type alias; available via `realm-web`
type Document = globalThis.Realm.Services.MongoDB.Document;

// Declare the interface for a "keypairs" document
interface keypairs extends Document {
    _id: string,
    publicKey: string,
    privateKey: string,
}

let App: Realm.App;
const ObjectId = Realm.BSON.ObjectID;

// Define the Worker logic
console.log("Defining the worker");
const worker: ExportedHandler<Bindings> = {
    async fetch(req, env) {
        const url = new URL(req.url);
        App = App || new Realm.App(env.REALM_APPID);

        const method = req.method;
        const path = url.pathname.replace(/[/]$/, '');
        const keypairs = url.searchParams.get('_id') || '';

        if (path !== '/api/keypairs') {
            return utils.toError(`Unknown "${path}" URL; try "/api/keypairs" instead.`, 404);
        }

        const token = req.headers.get('authorization');
        if (!token) return utils.toError('Missing "authorization" header; try to add the header "authorization: REALM_API_KEY".', 401);

        try {
            const credentials = Realm.Credentials.apiKey(token);
            // Attempt to authenticate
            var user = await App.logIn(credentials);
            var client = user.mongoClient('mongodb-atlas');
        } catch (err) {
            return utils.toError('Error with authentication.', 500);
        }

        // Grab a reference to the "MainDB keypairs" collection
        const collection = client.db('MainDB').collection<keypairs>('keypairs');

        try {
            if (method === 'GET') {
                // read the userid from the http request
                const _id = await req.clone().json();
                // GET /api/todos?id=XXX
                // find the document that matches the given id
                const doc = await collection.findOne({ _id });
                // return the document as JSON
                return utils.toJSON(doc);
                ;
            }

            // POST /api/todos
            if (method === 'POST') {          
                return utils.reply(
                    await collection.insertOne(await req.clone().json())
                );
            }

            // PATCH /api/todos?id=XXX&done=true
            if (method === 'PATCH') {
                return utils.reply(
                    await collection.updateOne({
                        _id: new ObjectId(keypairs)
                    }, {
                        $set: {
                            done: url.searchParams.get('done') === 'true'
                        }
                    })
                );
            }

            // DELETE /api/todos?id=XXX
            if (method === 'DELETE') {
                return utils.reply(
                    await collection.deleteOne({
                        _id: new ObjectId(keypairs)
                    })
                );
            }

            // unknown method
            return utils.toError('Method not allowed.', 405);
        } catch (err) {
            const msg = (err as Error).message || 'Error with query.';
            return utils.toError(msg, 500);
        }
    }
}

// Export for discoverability
export default worker;
