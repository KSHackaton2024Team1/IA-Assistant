const jsforce = require('jsforce');
let conn;

const login = async ({clientId, clientSecret, redirectUri}) => {
    const conn = await new jsforce.Connection({
        oauth2 : {
          // you can change loginUrl to connect to sandbox or prerelease env.
          // loginUrl : 'https://test.salesforce.com',
            clientId : clientId,
            clientSecret : clientSecret,
            redirectUri : redirectUri
        }
    });

    return conn;
}

const setPatientProperties = async (conn, properties) => {
    const rets = await conn.sobject('Contact').update([{
        Id : properties.id,
        FirstName : properties.firstName,
        LastName : properties.lastName,
        Email : properties.email,
        Mobile : properties.mobile,
        Birthdate : properties.birth,
        Age__c : properties.age,
        Height__c : properties.height,
        Weight__c : properties.weight,
        Thread__c : properties.thread
    }]);

    return rets[0];
}

module.exports = {
    login, 
    setPatientProperties,
};