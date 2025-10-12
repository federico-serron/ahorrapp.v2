const backendUrl = import.meta.env.VITE_BACKEND_URL;

const getState = ({ getStore, getActions, setStore }) => {
	return {
		store: {
			personas: ["Pedro", "Maria"],
			demoMsg: "",
			message: "",
			error: "",
			logged_user: {},
			user_loaded: false,

		},
		actions: {

			///////////////////////////////////////////////// AUTHENTICATION /////////////////////////////////////////////////////////////////

			getCurrentUser: async (force = false) => {
				const store = getStore();
				// If already loaded and not forcing, skip fetch
				if (store.user_loaded && !force) return;

				try {
					const resp = await fetch(`${backendUrl}/user/me`, {
						method: "GET",
						headers: { "Content-type": "application/json; charset=UTF-8" },
						credentials: "include"
					});
					if (!resp.ok) throw new Error(resp.statusText);
					const data = await resp.json();
					setStore({ ...store, logged_user: data, user_loaded: true });
					return data;
				} catch (error) {
					console.log(error.message);
					setStore({ ...store, logged_user: {}, user_loaded: true });
					return null;
				}
			},


			signup: async (name, email, password) => {
				const URLsignup = `${backendUrl}/user/signup`;
				const store = getStore()

				if (!name || !email || !password) {
					setStore({ ...store, error: "Required information missing." })
					return false;

				}

				try {
					const userData = {
						name: name,
						email: email,
						password: password
					}

					const response = await fetch(URLsignup, {
						method: "POST",
						body: JSON.stringify(userData),
						headers: {
							"Content-type": "application/json; charset=UTF-8"
						}
					})

					const data = await response.json()

					if (!response.ok) {
						throw new Error(data.error);
					}

					setStore({ ...store, message: data.msg })
					return true

				} catch (error) {
					setStore({ ...store, error: error.message })
					console.error(store.error)
					return false
				}

			},


			login: async (email, password) => {
				const URLlogin = `${backendUrl}/user/login`;
				const store = getStore()

				if (!email || !password) {
					setStore({ ...store, error: "Required information missing." })
					return false;
				}

				try {
					const userData = {
						email: email,
						password: password
					}

					const response = await fetch(URLlogin, {
						method: "POST",
						body: JSON.stringify(userData),
						headers: {
							"Content-type": "application/json; charset=UTF-8"
						},
						credentials: "include"
					})

					const data = await response.json()

					if (!response.ok) {
						throw new Error(data.error);
					}

					setStore({
						...store,
						logged_user: data.user || email,
						user_loaded: true,
						message: data.msg || "Inicio de sesión exitoso"
					});
					return true

				} catch (error) {
					setStore({ 
						...store, 
						error: error.message,
						logged_user: null,
						user_loaded: true
					});
					console.error(store.error)
					return false
				}

			},


			logout: async () => {
				const URLlogout = `${backendUrl}/user/logout`;
				const store = getStore();

				try {

					const response = await fetch(URLlogout, {
						method: "POST",
						headers: {
							"Content-type": "application/json"
						},
						credentials: "include"
					})

					const data = await response.json()

					if (!response.ok) {
						throw new Error(data.error);
					}

					setStore({ ...store, logged_user: {}, user_loaded: true })

					return true;

				} catch (error) {
					setStore({ ...store, error: error.message })
					return false;
					
				}
			},

			///////////////////////////////////////////////// PAYMENT METHODS /////////////////////////////////////////////////////////////////
			

		}
	};
};

export default getState;