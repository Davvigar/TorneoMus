package torneomus.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import torneomus.entity.Pareja;
import torneomus.repository.ParejaRepository;

import java.util.List;

@Configuration
public class DataLoader {

	private static final Logger log = LoggerFactory.getLogger(DataLoader.class);

	@Bean
	CommandLineRunner initParejas(ParejaRepository parejaRepository) {
		return args -> {
			long existentes = parejaRepository.count();
			log.info("Parejas existentes al iniciar: {}", existentes);
			if (existentes == 0) {
				List<String> nombres = List.of("Los Tigres", "Las Aguilas", "Los Lobos", "Las Panteras");
				for (String nombre : nombres) {
					if (!parejaRepository.existsByNombre(nombre)) {
						parejaRepository.save(new Pareja(nombre));
						log.info("Insertada pareja inicial: {}", nombre);
					}
				}
			} else {
				log.info("No se insertan parejas de ejemplo (ya hay registros)");
			}
		};
	}
} 