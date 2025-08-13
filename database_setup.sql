-- Script de configuración de la base de datos para el Torneo de Mus
-- Ejecutar este script en MySQL para crear la base de datos

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS torneo_mus 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE torneo_mus;

-- Verificar que la base de datos se creó correctamente
SELECT 'Base de datos torneo_mus creada exitosamente' AS mensaje;

-- Mostrar información de la base de datos
SHOW DATABASES LIKE 'torneo_mus';

-- Nota: Las tablas se crearán automáticamente cuando ejecutes la aplicación Spring Boot
-- debido a la configuración: spring.jpa.hibernate.ddl-auto=update

-- Para verificar la conexión, puedes ejecutar:
-- SHOW TABLES;
-- DESCRIBE parejas;
-- DESCRIBE enfrentamientos;
-- DESCRIBE pareja_rivales; 