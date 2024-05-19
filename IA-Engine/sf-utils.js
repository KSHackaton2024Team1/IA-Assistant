const jsforce = require('jsforce');

const patientFieldsByType = new Map().
    set('id', 'Id').
    set('firstName', 'FirstName').
    set('lastName', 'LastName').
    set('email', 'Email').
    set('mobilePhone', 'MobilePhone').
    set('birthdate', 'Birthdate').
    set('height', 'Height__c').
    set('weight', 'Weight__c');

const goalsFieldsByType = new Map().
    set('patientId', 'PatientId__c').
    set('name', 'Name').
    set('description', 'Description__c').
    set('targetDate', 'TargetDate__c');

const login = async (properties) => {
    const {
        loginUrl, 
        clientId, 
        clientSecret, 
        redirectUri, 
        username, 
        password, 
        securityToken
    } = properties;
    
    
    const conn = await new jsforce.Connection({
        oauth2 : {
            loginUrl : loginUrl,
            clientId : clientId,
            clientSecret : clientSecret,
            redirectUri : redirectUri
    }});

    const userInfo = await conn.login(username, password+securityToken);
    console.log(userInfo);

    return conn;
}

const setPatientProperties = async (conn, patient) => {
    const properties = getProperties(patientFieldsByType, patient);
    const ret = await conn.sobject('Contact').update(properties);
    return ret;
};

const getPatientProperties = async (conn, id) => {
    const contact = await conn.sobject('Contact').retrieve(id);
    return new Patient(contact);
};

const createPatientGoals = async (conn, goals) => {
    const formattedGoals = goals.map(goal => getProperties(goalsFieldsByType, goal));
    console.log(JSON.stringify(formattedGoals, null, 2));
    
    const rets = await conn.sobject('Goal__c').create(formattedGoals[0]);
    return rets;

};

const getProperties = (map, obj) => {
    const properties = {};

    for (const [key, value] of Object.entries(obj)) {
        const field = map.get(key);
        if (field) {
            properties[field] = value;
        }
    }

    return properties;
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
    getPatientProperties,
    createPatientGoals
};