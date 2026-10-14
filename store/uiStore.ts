import { create } from "zustand"

export type PaletteStory = { id: number; subject: string; status: string; assignee?: string }

type UiState = {
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  // Stories of the sprint on screen, so the palette can jump to them.
  sprintStories: PaletteStory[]
  setSprintStories: (stories: PaletteStory[]) => void
  focusIssueId: number | null
  focusIssue: (id: number | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  sprintStories: [],
  setSprintStories: (sprintStories) => set({ sprintStories }),
  focusIssueId: null,
  focusIssue: (focusIssueId) => set({ focusIssueId }),
}))
