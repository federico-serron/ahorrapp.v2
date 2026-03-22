const backendUrl = import.meta.env.VITE_BACKEND_URL;

const getCookie = (name) => {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return null;
};

const withJsonHeaders = (includeCsrf = false) => {
	const headers = { "Content-type": "application/json; charset=UTF-8" };
	if (includeCsrf) {
		const csrf = getCookie("csrf_access_token");
		if (csrf) headers["X-CSRF-TOKEN"] = csrf;
	}
	return headers;
};

const getState = ({ getStore, getActions, setStore }) => {
	return {
		store: {
			personas: ["Pedro", "Maria"],
			demoMsg: "",
			message: "",
			error: "",
			logged_user: {},
			user_loaded: false,
			transactions: [],
			transactions_pagination: { page: 1, per_page: 5, total: 0, pages: 1, has_next: false, has_prev: false },
			transactions_summary: { total_income: 0, total_expenses: 0, balance: 0, top_category: null },
			transactions_loaded: false,
			categories: [],
			categories_loaded: false,
			analytics: null,
			analytics_loaded: false,
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
						headers: withJsonHeaders(true),
						credentials: "include"
					})

					const data = await response.json()

					if (!response.ok) {
						throw new Error(data.error);
					}

					setStore({ ...store, logged_user: {}, user_loaded: true, transactions: [], transactions_pagination: { page: 1, per_page: 5, total: 0, pages: 1, has_next: false, has_prev: false }, transactions_summary: { total_income: 0, total_expenses: 0, balance: 0, top_category: null }, transactions_loaded: false, categories: [], categories_loaded: false })

					return true;

				} catch (error) {
					setStore({ ...store, error: error.message })
					return false;

				}
			},

			///////////////////////////////////////////////// TRANSACTIONS /////////////////////////////////////////////////////////////////

			getTransactions: async (page = 1, per_page = 5) => {
				const store = getStore();
				setStore({ ...store, transactions_loaded: false });
				try {
					const resp = await fetch(`${backendUrl}/transaction/?page=${page}&per_page=${per_page}`, {
						method: "GET",
						headers: { "Content-type": "application/json" },
						credentials: "include",
					});
					if (!resp.ok) throw new Error("Error al cargar las transacciones.");
					const data = await resp.json();
					setStore({ ...getStore(), transactions: data.data, transactions_pagination: data.pagination, transactions_summary: data.summary, transactions_loaded: true });
					return data;
				} catch (error) {
					setStore({ ...getStore(), error: error.message, transactions_loaded: true });
					return null;
				}
			},

			createTransaction: async (rawInput) => {
				const store = getStore();
				const SAFE_RE = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9\s+\-.,]+$/;
				const sanitized = (rawInput || '').trim();
				if (!sanitized) {
					setStore({ ...store, error: 'La descripción no puede estar vacía' });
					return null;
				}
				if (!SAFE_RE.test(sanitized)) {
					setStore({ ...store, error: 'La descripción contiene caracteres no permitidos' });
					return null;
				}
				try {
					const resp = await fetch(backendUrl + "/transaction/", {
						method: "POST",
						headers: withJsonHeaders(true),
						credentials: "include",
						body: JSON.stringify({ raw_input: sanitized }),
					});
					const data = await resp.json();
					if (!resp.ok) throw new Error(data.error);
					// Recargar página 1 para reflejar la nueva transacción
					await getActions().getTransactions(1, store.transactions_pagination.per_page);
					return data.data;
				} catch (error) {
					setStore({ ...store, error: error.message });
					return null;
				}
			},

			updateTransaction: async (id, data) => {
				const store = getStore();
				try {
					const resp = await fetch(`${backendUrl}/transaction/${id}`, {
						method: "PUT",
						headers: withJsonHeaders(true),
						credentials: "include",
						body: JSON.stringify(data),
					});
					const json = await resp.json();
					if (!resp.ok) throw new Error(json.error);
					await getActions().getTransactions(store.transactions_pagination.page, store.transactions_pagination.per_page);
					return json.data;
				} catch (error) {
					setStore({ ...getStore(), error: error.message });
					return null;
				}
			},

			deleteTransaction: async (id) => {
				const store = getStore();
				try {
					const resp = await fetch(`${backendUrl}/transaction/${id}`, {
						method: "DELETE",
						headers: withJsonHeaders(true),
						credentials: "include",
					});
					if (!resp.ok) throw new Error("Error al eliminar.");
					await getActions().getTransactions(store.transactions_pagination.page, store.transactions_pagination.per_page);
					return true;
				} catch (error) {
					setStore({ ...getStore(), error: error.message });
					return false;
				}
			},

			///////////////////////////////////////////////// ANALYTICS /////////////////////////////////////////////////////////////////

			getAnalytics: async (startDate, endDate) => {
				const store = getStore();
				setStore({ ...store, analytics_loaded: false });
				try {
					const resp = await fetch(`${backendUrl}/transaction/analytics?start_date=${startDate}&end_date=${endDate}`, {
						method: "GET",
						headers: { "Content-type": "application/json" },
						credentials: "include",
					});
					if (!resp.ok) throw new Error("Error al cargar analíticas.");
					const data = await resp.json();
					setStore({ ...getStore(), analytics: data, analytics_loaded: true });
					return data;
				} catch (error) {
					setStore({ ...getStore(), error: error.message, analytics_loaded: true });
					return null;
				}
			},

		///////////////////////////////////////////////// CATEGORIES /////////////////////////////////////////////////////////////////

			getCategories: async () => {
				const store = getStore();
				try {
					const resp = await fetch(backendUrl + "/category/", {
						method: "GET",
						headers: { "Content-type": "application/json" },
						credentials: "include",
					});
					if (!resp.ok) throw new Error("Error al cargar las categorías.");
					const data = await resp.json();
					setStore({ ...store, categories: data.data, categories_loaded: true });
					return data.data;
				} catch (error) {
					setStore({ ...store, error: error.message, categories_loaded: true });
					return null;
				}
			},

			createCategory: async (name, color) => {
				const store = getStore();
				const SAFE_RE = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9\s+\-.,]+$/;
				const sanitized = (name || '').trim();
				if (!sanitized) {
					setStore({ ...store, error: 'El nombre no puede estar vacío' });
					return null;
				}
				if (!SAFE_RE.test(sanitized)) {
					setStore({ ...store, error: 'El nombre contiene caracteres no permitidos' });
					return null;
				}
				try {
					const resp = await fetch(backendUrl + "/category/", {
						method: "POST",
						headers: withJsonHeaders(true),
						credentials: "include",
						body: JSON.stringify({ name: sanitized, color }),
					});
					const data = await resp.json();
					if (!resp.ok) throw new Error(data.error);
					setStore({ ...store, categories: [...store.categories, data.data], message: data.msg });
					return data.data;
				} catch (error) {
					setStore({ ...store, error: error.message });
					return null;
				}
			},

			deleteCategory: async (id) => {
				const store = getStore();
				try {
					const resp = await fetch(backendUrl + "/category/" + id, {
						method: "DELETE",
						headers: withJsonHeaders(true),
						credentials: "include",
					});
					const data = await resp.json();
					if (!resp.ok) throw new Error(data.error);
					setStore({ ...store, categories: store.categories.filter((c) => c.id !== id) });
					return true;
				} catch (error) {
					setStore({ ...store, error: error.message });
					return false;
				}
			},

		///////////////////////////////////////////////// PROFILE /////////////////////////////////////////////////////////////////

			updateProfile: async ({ name, phone }) => {
				const store = getStore();

				const LETTERS_RE = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;
				const PHONE_RE = /^\+?\d+$/;

				const trimmedName  = name  !== undefined ? name.trim()  : undefined;
				const trimmedPhone = phone !== undefined ? phone.trim() : undefined;

				if (trimmedName !== undefined) {
					if (!trimmedName) {
						setStore({ ...store, error: 'El nombre no puede estar vacío' });
						return false;
					}
					if (!LETTERS_RE.test(trimmedName)) {
						setStore({ ...store, error: 'El nombre solo puede contener letras' });
						return false;
					}
				}

				if (trimmedPhone !== undefined && trimmedPhone !== '' && !PHONE_RE.test(trimmedPhone)) {
					setStore({ ...store, error: 'El teléfono solo puede contener números y el símbolo +' });
					return false;
				}

				const body = {};
				if (trimmedName  !== undefined) body.name  = trimmedName;
				if (trimmedPhone !== undefined) body.phone = trimmedPhone || null;

				try {
					const resp = await fetch(backendUrl + "/user/me", {
						method: "PUT",
						headers: withJsonHeaders(true),
						credentials: "include",
						body: JSON.stringify(body),
					});
					const data = await resp.json();
					if (!resp.ok) throw new Error(data.error);
					setStore({ ...store, logged_user: { ...store.logged_user, ...body } });
					return true;
				} catch (error) {
					setStore({ ...store, error: error.message });
					return false;
				}
			},

		///////////////////////////////////////////////// PAYMENT METHODS /////////////////////////////////////////////////////////////////

			/////////////////// PAYPAL /////////////////////////
			createOrderPayPal: async (amount) => {
				const URLcreateOrder = `${backendUrl}/paypal/create-order`;
				const store = getStore()

				try {
					const response = await fetch(URLcreateOrder, {
						method: "POST",
						body: JSON.stringify({ amount: amount }),
						headers: {
							"Content-type": "application/json; charset=UTF-8"
						}
					})

					const data = await response.json()
					const approvalUrl = data.links.find((link) => link.rel === "approve")?.href;

					if (approvalUrl) {
						return approvalUrl;
					} else {
						throw new Error(data.error);
					}

				} catch (error) {
					setStore({ ...store, error: error.message })
					console.error(store.error)
					return false
				}
			},

			captureOrderPayPal: async (token) => {
				const URLcaptureOrder = `${backendUrl}/paypal/capture-order`;
				const store = getStore()

				try {
				const response = await fetch(URLcaptureOrder, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ order_id: token }),

				});

				const data = await response.json();

				if (data.status === "COMPLETED") {
					return data;
				}else{
					throw new Error(data.error);
				}

				} catch (error) {
					setStore({ ...store, error: error.message })
					return false
				}
			},

		}
	};
};

export default getState;