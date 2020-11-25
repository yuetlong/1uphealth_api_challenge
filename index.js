const readline = require('readline')
const {JSONPath} = require('jsonpath-plus')
const axios = require('axios')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.question('Enter access token: ', (token) => {
    main(token)
})

const main = async (token) => {
    let json = await getPatientEntries(token)
    let entries = await JSONPath({ path: '$.entry[*].resource', json})
    let patientData = await Promise.all(entries.map(entry => getIndividualPatientInfo(token, entry.id)))
    entries.forEach( (entry, index) => printPatientDetails(entry, patientData[index]))
    process.exit(0)
}

const printPatientDetails = (entry, patientData) => {
    console.log(`\n Patient ID: ${entry.id} \n`)
    console.log("Patient name")
    console.table(entry.name)
    console.log("Patient condition")
    console.table(getPatientCondition(patientData))
    console.log("Allergy Intolerance Substance")
    console.table(getPatientAllergyIntolerance(patientData))
    console.log("Medication Orders")
    console.table(getPatientMedicationOrder(patientData))
}

const getPatientCondition = (json) => {
    let resources = JSONPath({ path: "$.entry[?(@.resource.resourceType === 'Condition')].resource", json })
    return resources.map( r => { return {
        codeText: r?.code?.text,
        verificationStatus: r.verificationStatus,
        clinicalStatus: r.clinicalStatus,
        category: r?.category?.text,
    }});
}

const getPatientAllergyIntolerance = (json) => {
    let resources = JSONPath({ path: "$.entry[?(@.resource.resourceType === 'AllergyIntolerance')].resource", json })
    return resources.map( r => { return {
        substance: r?.substance?.text,
        recordedDate: r.recordedDate,
        criticality: r.criticality,
        onset: r.onset,
        status: r.status,
    }})
}

const getPatientMedicationOrder = (json) => {
    let resources = JSONPath({ path: "$.entry[?(@.resource.resourceType === 'MedicationOrder')].resource", json })
    return resources.map( r => { return {
        medicationReference: r?.medicationReference?.display,
        prescriber: r?.prescriber?.display,
        dateWritten : r.dateWritten,
        dosageInstruction: JSONPath({ path: "$.dosageInstruction[*].text", json : r })
    }})
}

const getPatientEntries = async (token) => {
    return await axiosGet(token, 'https://api.1up.health/fhir/dstu2/Patient')
}

const getIndividualPatientInfo = async (token, patient_id) => {
    return await axiosGet(token, `https://api.1up.health/fhir/dstu2/Patient/${patient_id}/$everything`)
}

const axiosGet = async (token, url) => {
    try {
        let response = await axios.get(url, {
            headers: {
                Authorization: ` Bearer ${token}`
            }
        });
        return response.data
    } catch (error) {
        console.log(error.response.body)
        process.exit(1)
    }
}