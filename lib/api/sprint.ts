import { api } from "./client"

/**
 * Fetches all sprints/versions for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Sprints/versions data
 */
export const getSprints = async (projectId: number) => {
  const res = await api.get(`/sprints?project_id=${projectId}`)
  return res?.data;
}

/**
 * Fetches a specific sprint/version by ID
 * @param {string} id - Sprint/version ID
 * @returns {Promise<Object>} Sprint/version details
 */
export const getSprintById = async (id: string) => {
  const res = await api.get(`/sprints/${id}`)
  return res?.data
}

/**
 * Creates a new version/sprint in a project
 * 
 * @async
 * @param {number} projectId - Project ID
 * @param {Object} versionData - Version data
 * @param {string} versionData.name - Version/sprint name (required)
 * @param {string} [versionData.description] - Version description
 * @param {string} [versionData.status] - Status (open, locked, closed)
 * @param {string} [versionData.due_date] - Due date in YYYY-MM-DD format
 * @returns {Promise<Object>} Created version with ID
 * @throws {Error} If API call fails
 * 
 * @example
 * const newVersion = await createVersion(123, {
 *   name: 'v1.0.0',
 *   status: 'open',
 *   due_date: '2024-06-30',
 *   description: 'First release'
 * })
 */
export const createVersion = async (projectId: number, versionData: any) => {
  try {
    const res = await api.post(`/sprints?project_id=${projectId}`, {
      version: versionData
    })
    return res?.data
  } catch (err) {
    console.error("Failed to create version:", err)
    throw err
  }
}

/**
 * Updates an existing version/sprint
 * 
 * @async
 * @param {number} versionId - Version/sprint ID
 * @param {Object} versionData - Fields to update
 * @param {string} [versionData.name] - Version name
 * @param {string} [versionData.description] - Version description
 * @param {string} [versionData.status] - Status (open, locked, closed)
 * @param {string} [versionData.due_date] - Due date in YYYY-MM-DD format
 * @returns {Promise<boolean>} Success status
 * @throws {Error} If API call fails
 * 
 * @example
 * await updateVersion(456, {
 *   status: 'closed',
 *   due_date: '2024-06-25'
 * })
 */
export const updateVersion = async (versionId: number, versionData: any) => {
  try {
    await api.put(`/sprints/${versionId}`, {
      version: versionData
    })
    return true
  } catch (err) {
    console.error("Failed to update version:", err)
    throw err
  }
}