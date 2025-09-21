import React from 'react';

const ContactView = () => {
    const [message, setMessage] = React.useState('');
    const [suggestedReply, setSuggestedReply] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleSuggestReply = async () => {
        if (!message) {
            setError('Por favor, escribe un mensaje primero.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuggestedReply('');

        const prompt = `Actúa como un asistente de soporte amigable y profesional. Escribe una respuesta concisa y útil al siguiente mensaje de un usuario. Empieza el mensaje de forma amigable y ofrece ayuda: "${message}"`;

        try {
            const apiKey = ""; // Provided by the environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);
            
            const result = await response.json();
            const text = result.candidates[0].content.parts[0].text;
            setSuggestedReply(text);

        } catch (e) {
            console.error(e);
            setError('No se pudo generar la sugerencia. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="bg-blue-100 dark:bg-gray-900 pt-24">
            <div className="py-8 lg:py-16 px-4 mx-auto max-w-screen-md">
                <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-center text-gray-900 dark:text-white">Contáctanos</h2>
                <p className="mb-8 lg:mb-16 font-light text-center text-gray-500 dark:text-gray-400 sm:text-xl">¿Tienes alguna pregunta o necesitas ayuda? Rellena el formulario y nos pondremos en contacto contigo.</p>
                <form action="#" className="space-y-8">
                    <div>
                        <label htmlFor="email-contact" className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Tu email</label>
                        <input type="email" id="email-contact" className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="nombre@email.com" required />
                    </div>
                    <div>
                        <label htmlFor="subject" className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Asunto</label>
                        <input type="text" id="subject" className="block p-3 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="¿En qué podemos ayudarte?" required />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="message" className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400">Tu mensaje</label>
                        <textarea id="message" rows="6" value={message} onChange={(e) => setMessage(e.target.value)} className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg shadow-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Escribe tu mensaje aquí..."></textarea>
                    </div>

                    {suggestedReply && (
                        <div className="p-4 text-sm text-gray-800 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            <h4 className="font-semibold mb-2">Respuesta Sugerida por la IA:</h4>
                            {suggestedReply}
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600 dark:text-red-500">{error}</p>}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button type="submit" className="py-3 px-5 text-sm font-medium text-center text-white rounded-lg bg-blue-700 sm:w-fit hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-colors">Enviar mensaje</button>
                        <button type="button" onClick={handleSuggestReply} disabled={isLoading} className="inline-flex items-center justify-center py-3 px-5 text-sm font-medium text-center text-gray-900 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 disabled:opacity-50 transition-colors">
                          {isLoading ? 'Pensando...' : '✨ Sugerir Respuesta'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default ContactView;
