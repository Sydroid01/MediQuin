import { createContext, useContext } from 'react'

// Shared by every page: { user, go, bump, toast, act }
//   go(key, id?)  navigate to a page (see nav.js)        toast(msg)  show a message
//   act(fn, ok, onErr)  run an API call, refresh data    bump()  re-fetch data from the database
export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)
