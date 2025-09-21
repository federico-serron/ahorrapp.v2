import React from 'react';
import { SparklesIcon } from '../components/Icons';

const HomeView = ({ onSignupClick }) => {
    const [topic, setTopic] = React.useState('');
    const [ideas, setIdeas] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleGenerateIdeas = async () => {
        if (!topic) {
            setError('Por favor, introduce un tema para generar ideas.');
            return;
        }
        setIsLoading(true);
        setError('');
        setIdeas([]);

        const prompt = `Basado en el tema "${topic}", genera 3 ideas de proyectos únicas y creativas que se puedan construir con un frontend de React y un backend de Flask. Para cada idea, proporciona un título y una breve descripción.`;

        try {
            const apiKey = ""; // Provided by the environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            ideas: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        description: { type: "STRING" }
                                    },
                                    required: ["title", "description"]
                                }
                            }
                        },
                        required: ["ideas"]
                    }
                }
            };
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error en la API: ${response.statusText}`);
            }

            const result = await response.json();
            const jsonText = result.candidates[0].content.parts[0].text;
            const parsedJson = JSON.parse(jsonText);
            setIdeas(parsedJson.ideas || []);

        } catch (e) {
            console.error(e);
            setError('No se pudieron generar ideas. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <section className="bg-blue-100 dark:bg-gray-900 pt-24">
                <div className="py-8 px-4 mx-auto max-w-7xl text-center lg:py-16 lg:px-6">
                    <h1 className="mb-6 mt-6 text-4xl font-extrabold tracking-tight leading-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                        Construye y despliega tu próxima idea más rápido
                    </h1>
                    <p className="mb-8 text-lg font-normal text-gray-600 lg:text-xl max-w-3xl mx-auto dark:text-gray-300">
                        Este boilerplate te da una base sólida con React en el frontend y Flask en el backend. Enfócate en tu lógica de negocio, no en la configuración inicial.
                    </p>
                    <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4 mb-12">
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                onSignupClick();
                            }}
                            className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-colors duration-200"
                            aria-label="Comenzar a construir mi proyecto"
                        >
                            Empezar ahora
                            <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </section>
            
            <section className="bg-gray-50 dark:bg-gray-800 py-16">
                <div className="px-4 mx-auto max-w-7xl lg:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="mb-6 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
                            ¿Sin inspiración? ¡Deja que la IA te ayude!
                        </h2>
                        <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                            Introduce un tema o una palabra clave y generaremos algunas ideas de proyectos para que empieces a construir con este boilerplate.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-8">
                            <div className="w-full">
                                <label htmlFor="topic-input" className="sr-only">Tema o palabra clave</label>
                                <input 
                                    id="topic-input"
                                    type="text" 
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateIdeas()}
                                    placeholder="Ej: 'Gestor de Tareas', 'Red Social para Mascotas'"
                                    className="w-full p-4 text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-all duration-200"
                                    aria-describedby={error ? "topic-error" : undefined}
                                />
                            </div>
                            <button 
                                onClick={handleGenerateIdeas} 
                                disabled={isLoading}
                                className="inline-flex items-center justify-center px-6 py-4 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap"
                                aria-label={isLoading ? 'Generando ideas...' : 'Generar ideas'}
                            >
                                <SparklesIcon className={`w-5 h-5 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
                                {isLoading ? 'Generando...' : '✨ Generar Ideas'}
                            </button>
                        </div>
                        
                        {error && (
                            <div id="topic-error" className="p-4 mb-8 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                                {error}
                            </div>
                        )}
                        
                        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 animate-pulse">
                                    <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                                </div>
                            ))}
                            
                            {!isLoading && ideas.map((idea, index) => (
                                <article 
                                    key={index} 
                                    className="p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                                        {idea.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {idea.description}
                                    </p>
                                </article>
                            ))}
                            
                            {!isLoading && ideas.length === 0 && (
                                <div className="col-span-full py-12 text-center">
                                    <div className="inline-block p-4 mb-4 bg-blue-100 rounded-full dark:bg-blue-900/30">
                                        <SparklesIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Sin ideas aún</h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Ingresa un tema y haz clic en "Generar Ideas" para comenzar.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default HomeView;
