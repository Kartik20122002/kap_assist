import { api } from "./client"

export const getStoriesBySprint = async (fixed_version_id: Number, projectId = null, isAdmin = false) => {
    let url = `/stories?project_id=${projectId}&fixed_version_id=${fixed_version_id}`
    if (!isAdmin) url = url + "&assigned_to_id=me"
    const res = await api.get(url)
    return res?.data?.issues ?? []
}

export const getBacklogStories = async (projectId: number, offset = 0, limit = 15) => {
    const res = await api.get(`/stories?project_id=${projectId}&no_version=true&status_filter=open&tracker_id_filter=5&offset=${offset}&limit=${limit}`)
    return {
        issues: res?.data?.issues ?? [],
        total_count: res?.data?.total_count ?? 0,
    }
}

export const getBugStories = async (projectId: number, offset = 0, limit = 15) => {
    const res = await api.get(`/stories?project_id=${projectId}&no_version=true&status_filter=open&tracker_id_filter=15&offset=${offset}&limit=${limit}`)
    return {
        issues: res?.data?.issues ?? [],
        total_count: res?.data?.total_count ?? 0,
    }
}

export const createStory = async (issue: any) => {
    try {
        await api.post(`/issue`, {
            issue
        })
        return true
    }
    catch (err) {
        console.log(err)
        return false
    }
}

export const updateStory = async (issue_id: Number, updates: any) => {
    try {
        await api.put(`/issue/${issue_id}`, {
            issue: updates
        })
        return true
    }
    catch (err) {
        console.log(err)
        return false
    }
}
