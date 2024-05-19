import jsforce from 'jsforce';

const patientFieldsByType = new Map([
    ['id', 'Id'],
    ['firstName', 'FirstName'],
    ['lastName', 'LastName'],
    ['email', 'Email'],
    ['mobilePhone', 'MobilePhone'],
    ['birthdate', 'Birthdate'],
    ['height', 'Height__c'],
    ['weight', 'Weight__c']
]);

const goalsFieldsByType = new Map([
    ['patientId', 'PatientId__c'],
    ['name', 'Name'],
    ['description', 'Description__c'],
    ['targetDate', 'TargetDate__c'],
    ['diagnostic', 'Diagnostic__c']
]);

export const login = async (properties) => {
    const {
        loginUrl, 
        clientId, 
        clientSecret, 
        redirectUri, 
        username, 
        password, 
        securityToken
    } = properties;
    
    const conn = new jsforce.Connection({
        oauth2 : {
            loginUrl : loginUrl,
            clientId : clientId,
            clientSecret : clientSecret,
            redirectUri : redirectUri
    }});

    try{
        const userInfo = await conn.login(username, password+securityToken);

        return conn;
    }catch(error){
        console.error('Error:', error);
    }
    
}

export const setPatientProperties = async (conn, patient) => {
    const properties = getProperties(patientFieldsByType, patient);

    try{
        const ret = await conn.sobject('Contact').update(properties);
        return ret;
    }catch(error){
        console.error('Error:', error);
    }
};

export const getPatientProperties = async (conn, id) => {
    try{
        const contact = await conn.sobject('Contact').retrieve(id);
        return new Patient(contact);
    }catch(error){
        console.error('Error:', error);
    }
};

export const createPatientGoals = async (conn, goals) => {
    const formattedGoals = goals.map(goal => getProperties(goalsFieldsByType, goal));

    try{
        const rets = await conn.sobject('Goal__c').create(formattedGoals[0]);
        return rets;
    }catch(error){
        console.error('Error:', error);
    }

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