import axios from "axios";

const instance = axios.create({
  // import.meta.env is used for Vite
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default instance;