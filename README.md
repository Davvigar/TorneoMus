# 🏆 Torneo de Mus para fiestas patronales de un municipio de Madrid - Spring Boot

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

https://torneomus.onrender.com/
**¡Disfruta gestionando tu torneo de mus! 🎮🏆** 
