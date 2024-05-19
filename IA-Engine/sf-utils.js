const jsforce = require('jsforce');
let conn;

const login = async ({loginUrl, clientId, clientSecret, redirectUri}) => {
    const conn = await new jsforce.Connection({
        oauth2 : {
            loginUrl : loginUrl,
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

const getPatientProperties = async (conn, id) => {
    const contact = await conn.sobject('Contact').retrieve(id);
    return new Patient(contact);
}

class Patient {
    constructor(contact) {
        this.id = contact.Id;
        this.firstName = contact.FirstName;
        this.lastName = contact.LastName;
        this.email = contact.Email;
        this.mobile = contact.Mobile;
        this.birth = contact.Birthdate;
        this.age = contact.Age__c;
        this.height = contact.Height__c;
        this.weight = contact.Weight__c;
        this.thread = contact.Thread__c;
    }
}

module.exports = {
    login, 
    setPatientProperties,
    getPatientProperties
};