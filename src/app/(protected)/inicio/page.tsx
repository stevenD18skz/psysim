export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PsySim</h1>
          <nav className="flex space-x-4">
            <a href="/inicio" className="text-gray-900 font-medium hover:text-indigo-600">
              Inicio
            </a>
            <a href="/configuracion" className="text-gray-500 hover:text-indigo-600">
              Configuración
            </a>
            <a href="/resultados" className="text-gray-500 hover:text-indigo-600">
              Resultados
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <a href="/perfil" className="text-gray-500 hover:text-indigo-600 text-sm">
              Perfil
            </a>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-gray-500 hover:text-red-600 text-sm">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Bienvenido a PsySim</h2>
          <p className="mt-2 text-gray-600">
            Simulador de entrevistas psicológicas para entrenamiento profesional
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="text-indigo-600 text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nueva Simulación</h3>
            <p className="text-gray-600 text-sm mb-4">
              Inicia una nueva sesión de entrevista con un paciente virtual
            </p>
            <a
              href="/configuracion"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Comenzar
            </a>
          </div>

          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="text-green-600 text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ver Resultados</h3>
            <p className="text-gray-600 text-sm mb-4">
              Revisa el historial y métricas de tus simulaciones anteriores
            </p>
            <a
              href="/resultados"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Ver resultados
            </a>
          </div>

          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="text-purple-600 text-3xl mb-4">⚙️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuración</h3>
            <p className="text-gray-600 text-sm mb-4">
              Personaliza escenarios, NPCs y parámetros de simulación
            </p>
            <a
              href="/configuracion"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Configurar
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
          <div className="text-gray-500 text-center py-8">
            <p>No hay simulaciones recientes</p>
            <p className="text-sm mt-1">Comienza una nueva simulación para ver tu historial aquí</p>
          </div>
        </div>
      </main>
    </div>
  );
}
