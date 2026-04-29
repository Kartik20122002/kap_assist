import { api } from "./client"

export const getTimeEntries = async (projectId: number, user_id: any = "me" ) => {
    const res = await api.get(`/time_entries?project_id=${projectId}&user_id=${user_id}&limit=100`)
    return res?.data?.time_entries ?? []
}

// date type = 2020-12-24
export const createTimeEntry = async (taskid: any, date: any, spent_hours: any, comments: any, category: any, type: any) => {
    const res = await api.post(`/time_entries`, {
        time_entry: {
            issue_id: taskid,
            spent_on: date,
            hours: spent_hours,
            comments: comments,
            custom_fields: [{ "id": 46, "name": "Work Category", "value": category }, { "id": 47, "name": "Work Type", "value": type }, { "id": 48, "name": "Country", "value": "India" }, { "id": 49, "name": "City", "value": "Pune" }]
        }
    })
    return true
}