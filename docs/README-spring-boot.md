# 🏆 Torneo de Mus - Spring Boot

Sistema completo para gestionar un torneo de mus desarrollado con Spring Boot, Java 17 y MySQL.

## 📋 Descripción

Este proyecto implementa un sistema de gestión de torneos de mus que cumple con las siguientes reglas:

- **Número indefinido de parejas** inscritas
- **Sistema de descanso** para parejas impares en cada ronda
- **Primeras dos rondas**: Sin eliminaciones, sin enfrentamientos repetidos
- **A partir de la tercera ronda**: Eliminación automática al acumular 2 derrotas
- **Torneo continúa** hasta que quede una pareja ganadora

## 🚀 Características

- ✅ **Gestión de parejas**: Registro con nombres únicos
- ✅ **Generación automática de emparejamientos** siguiendo las reglas del torneo
- ✅ **Sistema de resultados**: Formularios para registrar ganadores
- ✅ **Eliminación automática**: Parejas con 2 derrotas se eliminan automáticamente
- ✅ **Interfaz web moderna**: Diseño responsive con Bootstrap 5
- ✅ **Persistencia de datos**: Base de datos MySQL con JPA/Hibernate
- ✅ **Historial completo**: Seguimiento de todas las rondas y enfrentamientos

## 🛠️ Tecnologías Utilizadas

- **Backend**: Spring Boot 3.2.0, Java 17
- **Base de Datos**: MySQL 8.0
- **ORM**: Spring Data JPA con Hibernate
- **Frontend**: Thymeleaf, Bootstrap 5, Font Awesome
- **Build Tool**: Maven

## 📋 Requisitos Previos

- **Java 17** o superior
- **MySQL 8.0** o superior
- **Maven 3.6** o superior

## 🗄️ Configuración de la Base de Datos

1. **Crear la base de datos**:
```sql
CREATE DATABASE torneo_mus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Configurar credenciales** en `src/main/resources/application.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=1234
```

## ⚙️ Instalación y Ejecución

### 1. Clonar el proyecto
```bash
git clone <url-del-repositorio>
cd demo
```

### 2. Descargar dependencias
```bash
mvn clean install
```

### 3. Ejecutar la aplicación
```bash
mvn spring-boot:run
```

### 4. Acceder a la aplicación
Abrir el navegador en: `http://localhost:8080`

## 🎯 Uso del Sistema

### 1. **Registrar Parejas**
- En la página principal, usar el formulario "Registrar Nueva Pareja"
- Introducir un nombre único para cada pareja
- Las parejas se registran con 0 derrotas

### 2. **Generar Rondas**
- Hacer clic en "Generar Ronda" para crear emparejamientos
- El sistema automáticamente:
  - Evita enfrentamientos repetidos en las primeras rondas
  - Asigna descanso a una pareja si el número es impar
  - Crea enfrentamientos equilibrados

### 3. **Registrar Resultados**
- Para cada enfrentamiento pendiente, hacer clic en "Registrar Resultado"
- Seleccionar la pareja ganadora
- El sistema automáticamente:
  - Actualiza el enfrentamiento como jugado
  - Incrementa las derrotas del perdedor
  - Elimina parejas con 2 derrotas (a partir de ronda 3)

### 4. **Seguimiento del Torneo**
- **Página principal**: Estado general, enfrentamientos actuales
- **Clasificación**: Parejas activas y eliminadas
- **Historial**: Todas las rondas y resultados

## 🏗️ Estructura del Proyecto

```
src/main/java/torneomus/
├── Main.java                          # Clase principal de Spring Boot
├── controller/
│   └── TorneoController.java         # Controlador REST para la web
├── entity/
│   ├── Pareja.java                   # Entidad Pareja con JPA
│   └── Enfrentamiento.java           # Entidad Enfrentamiento con JPA
├── repository/
│   ├── ParejaRepository.java         # Repositorio JPA para Parejas
│   └── EnfrentamientoRepository.java # Repositorio JPA para Enfrentamientos
└── service/
    └── TorneoService.java            # Lógica de negocio del torneo

src/main/resources/
├── application.properties             # Configuración de la aplicación
└── templates/                        # Plantillas Thymeleaf
    ├── index.html                    # Página principal
    ├── resultado.html                # Formulario de resultados
    ├── clasificacion.html            # Tabla de clasificación
    └── historial.html                # Historial de rondas
```

## 🔧 Configuración Avanzada

### Cambiar puerto del servidor
```properties
server.port=8081
```

### Cambiar configuración de base de datos
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/mi_torneo
spring.datasource.username=mi_usuario
spring.datasource.password=mi_password
```

### Activar modo debug
```properties
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate.SQL=DEBUG
```

## 📊 Reglas del Torneo

### **Fases del Torneo**

1. **Fase de Inscripción**
   - Registro de parejas sin límite
   - Cada pareja comienza con 0 derrotas

2. **Primeras Dos Rondas**
   - Sin eliminaciones
   - No se repiten enfrentamientos
   - Todas las parejas participan

3. **A partir de la Tercera Ronda**
   - Eliminación automática al acumular 2 derrotas
   - Sistema de descanso para números impares
   - Continúa hasta que quede una pareja

### **Algoritmo de Emparejamiento**

- **Prioridad 1**: Parejas que no han jugado entre sí
- **Prioridad 2**: Evitar enfrentamientos repetidos
- **Prioridad 3**: Distribución equilibrada de descansos

## 🐛 Solución de Problemas

### Error de conexión a MySQL
- Verificar que MySQL esté ejecutándose
- Comprobar credenciales en `application.properties`
- Asegurar que la base de datos `torneo_mus` existe

### Error de compilación
- Verificar que Java 17 esté instalado: `java -version`
- Limpiar y reinstalar dependencias: `mvn clean install`

### Error de puerto ocupado
- Cambiar puerto en `application.properties`
- Verificar que no haya otra aplicación usando el puerto 8080

## 📝 Licencia

Este proyecto está desarrollado como demostración educativa.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para sugerencias o mejoras.

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto, por favor abre un issue en el repositorio.

---

**¡Disfruta gestionando tu torneo de mus! 🎮🏆** 