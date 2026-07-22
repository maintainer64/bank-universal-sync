if ENV["SELF_HOSTED"] == "true"
  # Отключаем Rack::Attack rate limiting для локального тестирования
  Rack::Attack.enabled = false
  Rails.logger.warn("[SELF_HOSTED] Rack::Attack rate limiting ОТКЛЮЧЁН (SELF_HOSTED=true)") if Rails.logger
end