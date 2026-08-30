"use strict";

const firebaseConfig = {
  apiKey: "AIzaSyDCBacYdDwQ8-9kNgmvMuQ0Q95CXLdBZHQ",
  authDomain: "mtflix-79292.firebaseapp.com",
  projectId: "mtflix-79292",
  storageBucket: "mtflix-79292.firebasestorage.app",
  messagingSenderId: "788293924878",
  appId: "1:788293924878:web:eb367a8bd1814bd9ade45f",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Real email delivery for verification codes via EmailJS (emailjs.com — free, no backend).
// Leave these blank to keep the on-screen demo inbox fallback used for local testing.
const EMAILJS_PUBLIC_KEY = "vbh9XopeuuHGcqM_W";
const EMAILJS_SERVICE_ID = "service_hdvg4lk";
const EMAILJS_TEMPLATE_ID = "template_hzsk6sq";

// Add your own account email(s) here to unlock the Admin Dashboard for that account.
const ADMIN_EMAILS = ["miguelturkk12@gmail.com"];

function isAdmin(email) {
  return !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

const TMDB_API_KEY = "d3f97b423b8ea5b94ed9e7a5804c0e96";

const API_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/";
const LS_KEY = "cineverse_api_key";
const LS_LIST = "cineverse_watchlist";
const LS_PROGRESS = "cineverse_progress";

const PLAYER_SOURCES = {
  vidlink: {
    label: "VidLink",
    movie: "https://vidlink.pro/movie/{id}",
    tv: "https://vidlink.pro/tv/{id}/{season}/{episode}",
    supportsEvents: true,
    buildParams(type, resumeSeconds) {
      const params = new URLSearchParams({ primaryColor: "e50914", secondaryColor: "221f1f", iconColor: "ffffff" });
      if (type === "tv" && activeProfile()?.autoplay !== false) params.set("nextbutton", "true");
      if (resumeSeconds > 30) params.set("startAt", String(Math.floor(resumeSeconds)));
      return params;
    },
  },
  vidking: {
    label: "VidKing",
    movie: "https://www.vidking.net/embed/movie/{id}",
    tv: "https://www.vidking.net/embed/tv/{id}/{season}/{episode}",
    supportsEvents: true,
    buildParams(type, resumeSeconds) {
      const params = new URLSearchParams({ color: "e50914" });
      if (type === "tv" && activeProfile()?.autoplay !== false) {
        params.set("nextEpisode", "true");
        params.set("episodeSelector", "true");
      }
      if (resumeSeconds > 30) params.set("progress", String(Math.floor(resumeSeconds)));
      return params;
    },
  },
  vidsrc: {
    label: "VidSrc",
    movie: "https://vidsrc.to/embed/movie/{id}",
    tv: "https://vidsrc.to/embed/tv/{id}/{season}/{episode}",
    supportsEvents: false,
    buildParams() {
      return new URLSearchParams();
    },
  },
  "2embed": {
    label: "2Embed",
    movie: "https://2embed.cc/embed/movie/{id}",
    tv: "https://2embed.cc/embed/tv/{id}/{season}/{episode}",
    supportsEvents: false,
    buildParams() {
      return new URLSearchParams();
    },
  },
};

const LS_PLAYER_SOURCE = "cineverse_player_source";
const DEFAULT_PLAYER_SOURCE = "vidlink";

function getPlayerSourceId() {
  const id = localStorage.getItem(LS_PLAYER_SOURCE);
  return id && PLAYER_SOURCES[id] ? id : DEFAULT_PLAYER_SOURCE;
}

function setPlayerSourceId(id) {
  if (PLAYER_SOURCES[id]) localStorage.setItem(LS_PLAYER_SOURCE, id);
}

let currentPlayer = null;

const LS_PROFILES = "cineverse_profiles";
const LS_SESSION = "cineverse_session";
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#e50914,#7a0008)",
  "linear-gradient(135deg,#6c5ce7,#341f97)",
  "linear-gradient(135deg,#0984e3,#083b66)",
  "linear-gradient(135deg,#00b894,#00694f)",
  "linear-gradient(135deg,#fdcb6e,#b8860b)",
  "linear-gradient(135deg,#e17055,#8b3a2b)",
  "linear-gradient(135deg,#fd79a8,#a4135c)",
  "linear-gradient(135deg,#636e72,#2d3436)",
];
let appStarted = false;
let gateEditing = false;
let editorState = null;
let editingProfileId = null;
let listTab = "list";

const LS_USERS = "cineverse_users";
const LS_AUTH = "cineverse_auth";
const LS_TRACK = "cineverse_track";
const LS_EPWATCH = "cineverse_epwatch";
const TRACK_STATUSES = [
  { id: "plan", label: "Plan to Watch" },
  { id: "watching", label: "Watching" },
  { id: "completed", label: "Completed" },
  { id: "hold", label: "On Hold" },
  { id: "dropped", label: "Dropped" },
];
const STATUS_MAP = Object.fromEntries(TRACK_STATUSES.map((s) => [s.id, s.label]));

const DICE_STYLES = ["adventurer", "bottts", "fun-emoji", "lorelei", "micah", "pixel-art", "thumbs"];

const I18N = {
  en: {
    nav_home: "Home", nav_movies: "Movies", nav_tv: "TV Shows", nav_list: "My List",
    search_ph: "Titles, people, genres",
    gate_title: "Who's watching?", gate_manage: "Manage Profiles",
    menu_settings: "Settings", menu_manage: "Manage Profiles", menu_switch: "Switch Profile", menu_signout: "Sign Out",
    auth_in: "Sign In", auth_up: "Sign Up", auth_email: "Email", auth_pass: "Password",
    auth_pass_min: "Password (min 6 characters)", auth_pass2: "Confirm password", auth_name: "Display name",
    signin_btn: "Sign In", signup_btn: "Create Account", guest_link: "Continue as guest",
    verify_title: "Check your email", pin_enter_title: "Enter profile PIN", cancel: "Cancel",
    settings_title: "Settings", sec_playback: "Playback", sec_language: "Language", sec_privacy: "Privacy & Security",
    set_autoplay_label: "Auto-play next episode", set_autoplay_desc: "When an episode ends, automatically start the next one.",
    set_lang_desc: "App interface and movie descriptions language.",
    privacy_pin_desc: "Require a 4-digit PIN to open this profile.",
    pin_new: "New PIN (4 digits)", pin_confirm: "Confirm PIN", pin_current: "Current PIN", pin_save: "Save",
    pin_enable: "Enable PIN", pin_change: "Change PIN", pin_disable: "Disable PIN", pin_enabled_on: "PIN protection is ON for this profile.",
    pw_desc: "Update the password for your MTFlix account.", pw_current: "Current password", pw_new: "New password",
    pw_confirm: "Confirm new password", pw_update: "Update Password",
    profile_add_title: "Add a profile", profile_edit_title: "Edit profile",
    profile_name_ph: "Name", profile_save: "Save", profile_cancel: "Cancel", profile_delete: "Delete",
    tab_colors: "Colors", tab_avatars: "Avatars", tab_custom: "Custom", btn_upload: "Choose Image", btn_random: "🎲 Random",
    list_watchlist: "Watchlist", list_tracking: "Tracking",
    hdr_trailer: "Watch Trailer", hdr_play: "Play", hdr_resume: "Resume",
    mylist_add: "Add to My List", mylist_in: "In My List ✓",
    st_plan: "Plan to Watch", st_watching: "Watching", st_completed: "Completed", st_hold: "On Hold", st_dropped: "Dropped",
    row_trending: "Trending Now", row_popmovies: "Popular Movies", row_toprated: "Top Rated of All Time",
    row_poptv: "Binge-Worthy TV Shows", row_action: "Action & Adventure", row_scifi: "Sci-Fi Worlds",
    row_horror: "Lights Off — Horror", row_comedy: "Comedies to Chill With", row_animation: "Animation for Everyone",
    row_romance: "Romance Night In", row_airing: "Airing This Week", row_continue: "Continue Watching",
    filter_all_genres: "All Genres", filter_all_years: "All Years", filter_load_more: "Load More",
    filter_no_results: "No titles match those filters", filter_no_results_sub: "Try a different genre or year.",
  },
  es: {
    nav_home: "Inicio", nav_movies: "Películas", nav_tv: "Series", nav_list: "Mi Lista",
    search_ph: "Títulos, personas, géneros",
    gate_title: "¿Quién está viendo?", gate_manage: "Administrar perfiles",
    menu_settings: "Ajustes", menu_manage: "Administrar perfiles", menu_switch: "Cambiar perfil", menu_signout: "Cerrar sesión",
    auth_in: "Iniciar sesión", auth_up: "Registrarse", auth_email: "Correo electrónico", auth_pass: "Contraseña",
    auth_pass_min: "Contraseña (mínimo 6 caracteres)", auth_pass2: "Confirmar contraseña", auth_name: "Nombre visible",
    signin_btn: "Iniciar sesión", signup_btn: "Crear cuenta", guest_link: "Continuar como invitado",
    verify_title: "Revisa tu correo", pin_enter_title: "Introduce el PIN del perfil", cancel: "Cancelar",
    settings_title: "Ajustes", sec_playback: "Reproducción", sec_language: "Idioma", sec_privacy: "Privacidad y seguridad",
    set_autoplay_label: "Reproducir siguiente episodio automáticamente", set_autoplay_desc: "Cuando termina un episodio, empieza el siguiente automáticamente.",
    set_lang_desc: "Idioma de la interfaz y de las descripciones.",
    privacy_pin_desc: "Pedir un PIN de 4 dígitos para abrir este perfil.",
    pin_new: "PIN nuevo (4 dígitos)", pin_confirm: "Confirmar PIN", pin_current: "PIN actual", pin_save: "Guardar",
    pin_enable: "Activar PIN", pin_change: "Cambiar PIN", pin_disable: "Desactivar PIN", pin_enabled_on: "La protección por PIN está ACTIVADA para este perfil.",
    pw_desc: "Actualiza la contraseña de tu cuenta MTFlix.", pw_current: "Contraseña actual", pw_new: "Contraseña nueva",
    pw_confirm: "Confirmar nueva contraseña", pw_update: "Actualizar contraseña",
    profile_add_title: "Añadir un perfil", profile_edit_title: "Editar perfil",
    profile_name_ph: "Nombre", profile_save: "Guardar", profile_cancel: "Cancelar", profile_delete: "Eliminar",
    tab_colors: "Colores", tab_avatars: "Avatares", tab_custom: "Personalizado", btn_upload: "Elegir imagen", btn_random: "🎲 Aleatorio",
    list_watchlist: "Mi Lista", list_tracking: "Seguimiento",
    hdr_trailer: "Ver tráiler", hdr_play: "Reproducir", hdr_resume: "Reanudar",
    mylist_add: "Añadir a Mi Lista", mylist_in: "En Mi Lista ✓",
    st_plan: "Pendiente", st_watching: "Viendo", st_completed: "Completado", st_hold: "En pausa", st_dropped: "Abandonado",
    row_trending: "Tendencias", row_popmovies: "Películas populares", row_toprated: "Las mejor valoradas",
    row_poptv: "Series para maratón", row_action: "Acción y aventura", row_scifi: "Mundos de ciencia ficción",
    row_horror: "Apaga la luz — Terror", row_comedy: "Comedias para relajar", row_animation: "Animación para todos",
    row_romance: "Noche romántica", row_airing: "Al aire esta semana", row_continue: "Seguir viendo",
  },
  fr: {
    nav_home: "Accueil", nav_movies: "Films", nav_tv: "Séries", nav_list: "Ma Liste",
    search_ph: "Titres, personnes, genres",
    gate_title: "Qui est-ce ?", gate_manage: "Gérer les profils",
    menu_settings: "Paramètres", menu_manage: "Gérer les profils", menu_switch: "Changer de profil", menu_signout: "Se déconnecter",
    auth_in: "Se connecter", auth_up: "S'inscrire", auth_email: "E-mail", auth_pass: "Mot de passe",
    auth_pass_min: "Mot de passe (min. 6 caractères)", auth_pass2: "Confirmer le mot de passe", auth_name: "Nom affiché",
    signin_btn: "Se connecter", signup_btn: "Créer un compte", guest_link: "Continuer en invité",
    verify_title: "Vérifiez votre e-mail", pin_enter_title: "Entrez le code du profil", cancel: "Annuler",
    settings_title: "Paramètres", sec_playback: "Lecture", sec_language: "Langue", sec_privacy: "Confidentialité et sécurité",
    set_autoplay_label: "Lecture auto de l'épisode suivant", set_autoplay_desc: "À la fin d'un épisode, lance automatiquement le suivant.",
    set_lang_desc: "Langue de l'interface et des descriptions.",
    privacy_pin_desc: "Exiger un code à 4 chiffres pour ouvrir ce profil.",
    pin_new: "Nouveau code (4 chiffres)", pin_confirm: "Confirmer le code", pin_current: "Code actuel", pin_save: "Enregistrer",
    pin_enable: "Activer le code", pin_change: "Modifier le code", pin_disable: "Désactiver le code", pin_enabled_on: "La protection par code est ACTIVE pour ce profil.",
    pw_desc: "Mettez à jour le mot de passe de votre compte MTFlix.", pw_current: "Mot de passe actuel", pw_new: "Nouveau mot de passe",
    pw_confirm: "Confirmer le nouveau mot de passe", pw_update: "Mettre à jour",
    profile_add_title: "Ajouter un profil", profile_edit_title: "Modifier le profil",
    profile_name_ph: "Nom", profile_save: "Enregistrer", profile_cancel: "Annuler", profile_delete: "Supprimer",
    tab_colors: "Couleurs", tab_avatars: "Avatars", tab_custom: "Personnalisé", btn_upload: "Choisir une image", btn_random: "🎲 Aléatoire",
    list_watchlist: "Ma Liste", list_tracking: "Suivi",
    hdr_trailer: "Voir la bande-annonce", hdr_play: "Lecture", hdr_resume: "Reprendre",
    mylist_add: "Ajouter à Ma Liste", mylist_in: "Dans Ma Liste ✓",
    st_plan: "À voir", st_watching: "En cours", st_completed: "Terminé", st_hold: "En pause", st_dropped: "Abandonné",
    row_trending: "Tendances", row_popmovies: "Films populaires", row_toprated: "Les mieux notés",
    row_poptv: "Séries à dévorer", row_action: "Action et aventure", row_scifi: "Univers science-fiction",
    row_horror: "Lumières éteintes — Horreur", row_comedy: "Comédies détente", row_animation: "Animation pour tous",
    row_romance: "Soirée romance", row_airing: "Diffusées cette semaine", row_continue: "Reprendre",
  },
  de: {
    nav_home: "Startseite", nav_movies: "Filme", nav_tv: "Serien", nav_list: "Meine Liste",
    search_ph: "Titel, Personen, Genres",
    gate_title: "Wer schaut zu?", gate_manage: "Profile verwalten",
    menu_settings: "Einstellungen", menu_manage: "Profile verwalten", menu_switch: "Profil wechseln", menu_signout: "Abmelden",
    auth_in: "Anmelden", auth_up: "Registrieren", auth_email: "E-Mail", auth_pass: "Passwort",
    auth_pass_min: "Passwort (mind. 6 Zeichen)", auth_pass2: "Passwort bestätigen", auth_name: "Anzeigename",
    signin_btn: "Anmelden", signup_btn: "Konto erstellen", guest_link: "Als Gast fortfahren",
    verify_title: "Prüfe dein Postfach", pin_enter_title: "Profil-PIN eingeben", cancel: "Abbrechen",
    settings_title: "Einstellungen", sec_playback: "Wiedergabe", sec_language: "Sprache", sec_privacy: "Datenschutz & Sicherheit",
    set_autoplay_label: "Nächste Folge automatisch abspielen", set_autoplay_desc: "Wenn eine Folge endet, startet die nächste automatisch.",
    set_lang_desc: "Sprache der Oberfläche und der Beschreibungen.",
    privacy_pin_desc: "Eine 4-stellige PIN zum Öffnen dieses Profils erforderlich.",
    pin_new: "Neue PIN (4 Ziffern)", pin_confirm: "PIN bestätigen", pin_current: "Aktuelle PIN", pin_save: "Speichern",
    pin_enable: "PIN aktivieren", pin_change: "PIN ändern", pin_disable: "PIN deaktivieren", pin_enabled_on: "PIN-Schutz ist für dieses Profil AKTIV.",
    pw_desc: "Aktualisiere das Passwort deines MTFlix-Kontos.", pw_current: "Aktuelles Passwort", pw_new: "Neues Passwort",
    pw_confirm: "Neues Passwort bestätigen", pw_update: "Passwort aktualisieren",
    profile_add_title: "Profil hinzufügen", profile_edit_title: "Profil bearbeiten",
    profile_name_ph: "Name", profile_save: "Speichern", profile_cancel: "Abbrechen", profile_delete: "Löschen",
    tab_colors: "Farben", tab_avatars: "Avatare", tab_custom: "Eigenes", btn_upload: "Bild auswählen", btn_random: "🎲 Zufällig",
    list_watchlist: "Meine Liste", list_tracking: "Verfolgung",
    hdr_trailer: "Trailer ansehen", hdr_play: "Abspielen", hdr_resume: "Fortsetzen",
    mylist_add: "Zur Meine Liste hinzufügen", mylist_in: "In Meine Liste ✓",
    st_plan: "Geplant", st_watching: "Am Schauen", st_completed: "Abgeschlossen", st_hold: "Pausiert", st_dropped: "Abgebrochen",
    row_trending: "Im Trend", row_popmovies: "Beliebte Filme", row_toprated: "Beste aller Zeiten",
    row_poptv: "Serien zum Binge-Watchen", row_action: "Action & Abenteuer", row_scifi: "Sci-Fi-Welten",
    row_horror: "Licht aus — Horror", row_comedy: "Comedys zum Entspannen", row_animation: "Animation für alle",
    row_romance: "Romantischer Abend", row_airing: "Diese Woche neu", row_continue: "Weiterschauen",
  },
  pt: {
    nav_home: "Início", nav_movies: "Filmes", nav_tv: "Séries", nav_list: "Minha Lista",
    search_ph: "Títulos, pessoas, gêneros",
    gate_title: "Quem está assistindo?", gate_manage: "Gerenciar perfis",
    menu_settings: "Configurações", menu_manage: "Gerenciar perfis", menu_switch: "Trocar perfil", menu_signout: "Sair",
    auth_in: "Entrar", auth_up: "Cadastrar", auth_email: "E-mail", auth_pass: "Senha",
    auth_pass_min: "Senha (mínimo 6 caracteres)", auth_pass2: "Confirmar senha", auth_name: "Nome de exibição",
    signin_btn: "Entrar", signup_btn: "Criar conta", guest_link: "Continuar como convidado",
    verify_title: "Verifique seu e-mail", pin_enter_title: "Digite o PIN do perfil", cancel: "Cancelar",
    settings_title: "Configurações", sec_playback: "Reprodução", sec_language: "Idioma", sec_privacy: "Privacidade e segurança",
    set_autoplay_label: "Reproduzir próximo episódio automaticamente", set_autoplay_desc: "Quando um episódio termina, o próximo começa automaticamente.",
    set_lang_desc: "Idioma da interface e das descrições.",
    privacy_pin_desc: "Exigir um PIN de 4 dígitos para abrir este perfil.",
    pin_new: "Novo PIN (4 dígitos)", pin_confirm: "Confirmar PIN", pin_current: "PIN atual", pin_save: "Salvar",
    pin_enable: "Ativar PIN", pin_change: "Alterar PIN", pin_disable: "Desativar PIN", pin_enabled_on: "A proteção por PIN está ATIVA neste perfil.",
    pw_desc: "Atualize a senha da sua conta MTFlix.", pw_current: "Senha atual", pw_new: "Nova senha",
    pw_confirm: "Confirmar nova senha", pw_update: "Atualizar senha",
    profile_add_title: "Adicionar um perfil", profile_edit_title: "Editar perfil",
    profile_name_ph: "Nome", profile_save: "Salvar", profile_cancel: "Cancelar", profile_delete: "Excluir",
    tab_colors: "Cores", tab_avatars: "Avatares", tab_custom: "Personalizado", btn_upload: "Escolher imagem", btn_random: "🎲 Aleatório",
    list_watchlist: "Minha Lista", list_tracking: "Acompanhamento",
    hdr_trailer: "Assistir trailer", hdr_play: "Reproduzir", hdr_resume: "Retomar",
    mylist_add: "Adicionar à Minha Lista", mylist_in: "Na Minha Lista ✓",
    st_plan: "Planejo ver", st_watching: "Assistindo", st_completed: "Concluído", st_hold: "Em pausa", st_dropped: "Abandonado",
    row_trending: "Em alta", row_popmovies: "Filmes populares", row_toprated: "Melhores de todos os tempos",
    row_poptv: "Séries para maratonar", row_action: "Ação e aventura", row_scifi: "Mundos de ficção científica",
    row_horror: "Luzes apagadas — Terror", row_comedy: "Comédias para relaxar", row_animation: "Animação para todos",
    row_romance: "Noite romântica", row_airing: "No ar esta semana", row_continue: "Continuar assistindo",
  },
  tr: {
    nav_home: "Ana Sayfa", nav_movies: "Filmler", nav_tv: "Diziler", nav_list: "Listem",
    search_ph: "Başlık, kişi, tür",
    gate_title: "Kim izliyor?", gate_manage: "Profilleri Yönet",
    menu_settings: "Ayarlar", menu_manage: "Profilleri Yönet", menu_switch: "Profil Değiştir", menu_signout: "Çıkış Yap",
    auth_in: "Giriş Yap", auth_up: "Kayıt Ol", auth_email: "E-posta", auth_pass: "Şifre",
    auth_pass_min: "Şifre (en az 6 karakter)", auth_pass2: "Şifreyi Onayla", auth_name: "Görünen ad",
    signin_btn: "Giriş Yap", signup_btn: "Hesap Oluştur", guest_link: "Misafir olarak devam et",
    verify_title: "E-postanı kontrol et", pin_enter_title: "Profil PIN kodunu gir", cancel: "İptal",
    settings_title: "Ayarlar", sec_playback: "Oynatma", sec_language: "Dil", sec_privacy: "Gizlilik ve Güvenlik",
    set_autoplay_label: "Sonraki bölümü otomatik oynat", set_autoplay_desc: "Bir bölüm bittiğinde sonraki otomatik olarak başlar.",
    set_lang_desc: "Arayüz ve film açıklamaları dili.",
    privacy_pin_desc: "Bu profili açmak için 4 haneli PIN gerekli.",
    pin_new: "Yeni PIN (4 hane)", pin_confirm: "PIN'i onayla", pin_current: "Mevcut PIN", pin_save: "Kaydet",
    pin_enable: "PIN'i etkinleştir", pin_change: "PIN'i değiştir", pin_disable: "PIN'i kapat", pin_enabled_on: "Bu profil için PIN koruması AÇIK.",
    pw_desc: "MTFlix hesabının şifresini güncelle.", pw_current: "Mevcut şifre", pw_new: "Yeni şifre",
    pw_confirm: "Yeni şifreyi onayla", pw_update: "Şifreyi güncelle",
    profile_add_title: "Profil ekle", profile_edit_title: "Profili düzenle",
    profile_name_ph: "İsim", profile_save: "Kaydet", profile_cancel: "İptal", profile_delete: "Sil",
    tab_colors: "Renkler", tab_avatars: "Avatarlar", tab_custom: "Özel", btn_upload: "Resim seç", btn_random: "🎲 Rastgele",
    list_watchlist: "Listem", list_tracking: "Takip",
    hdr_trailer: "Fragmanı izle", hdr_play: "Oynat", hdr_resume: "Devam Et",
    mylist_add: "Listeme Ekle", mylist_in: "Listemde ✓",
    st_plan: "İzleyecek", st_watching: "İzliyor", st_completed: "Tamamladı", st_hold: "Bekletiyor", st_dropped: "Bıraktı",
    row_trending: "Popüler", row_popmovies: "Popüler Filmler", row_toprated: "Tüm Zamanların En İyileri",
    row_poptv: "Kaçırılmayacak Diziler", row_action: "Aksiyon ve Macera", row_scifi: "Bilim Kurgu Dünyaları",
    row_horror: "Işıkları Kapat — Korku", row_comedy: "Keyifli Komediler", row_animation: "Herkese Animasyon",
    row_romance: "Romantik Gece", row_airing: "Bu Hafta Yayında", row_continue: "İzlemeye Devam Et",
  },
};

const LANGS = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "pt", label: "Português" },
  { id: "tr", label: "Türkçe" },
];

function activeProfile() {
  return getProfiles().find((p) => p.id === localStorage.getItem(LS_SESSION));
}

function lang() {
  return activeProfile()?.lang || "en";
}

function t(key) {
  const table = I18N[lang()] || I18N.en;
  return table[key] ?? I18N.en[key] ?? key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function diceUrl(style, seed) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed || "x")}`;
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function isDiceAvatar(p) {
  return Boolean(p?.avatar && p.avatar.type === "dice");
}

function hasImageAvatar(p) {
  return Boolean(p?.avatar && (p.avatar.type === "dice" || p.avatar.type === "custom"));
}

function avatarBackground(p) {
  if (!p?.avatar) return null;
  if (p.avatar.type === "dice") return `url("${diceUrl(p.avatar.style, p.avatar.seed)}") center / cover no-repeat`;
  if (p.avatar.type === "custom") return `url("${p.avatar.data}") center / cover no-repeat`;
  return null;
}

function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("not-image"));
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / image.width, size / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.onerror = () => reject(new Error("bad-image"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("read-error"));
    reader.readAsDataURL(file);
  });
}

function renderAvatarInto(el, p) {
  if (!el || !p) return;
  const bg = avatarBackground(p);
  if (bg) {
    el.textContent = "";
    el.style.background = bg;
  } else {
    el.textContent = (p.name[0] || "?").toUpperCase();
    el.style.background = AVATAR_GRADIENTS[(p.g ?? 0) % AVATAR_GRADIENTS.length];
  }
}

let apiKey =
  TMDB_API_KEY && TMDB_API_KEY !== "YOUR_TMDB_API_KEY"
    ? TMDB_API_KEY
    : localStorage.getItem(LS_KEY) || "";

let genreMaps = { movie: {}, tv: {} };
let heroItems = [];
let heroIndex = 0;
let heroTimer = null;
let searchTimer = null;

const ROWS = [
  { id: "trending", titleKey: "row_trending", path: "/trending/all/day" },
  { id: "popular-movies", titleKey: "row_popmovies", path: "/movie/popular" },
  { id: "top-rated", titleKey: "row_toprated", path: "/movie/top_rated" },
  { id: "popular-tv", titleKey: "row_poptv", path: "/tv/popular" },
  { id: "action", titleKey: "row_action", path: "/discover/movie", params: { with_genres: 28, sort_by: "popularity.desc" } },
  { id: "scifi", titleKey: "row_scifi", path: "/discover/movie", params: { with_genres: 878, sort_by: "popularity.desc" } },
  { id: "horror", titleKey: "row_horror", path: "/discover/movie", params: { with_genres: 27, sort_by: "popularity.desc" } },
  { id: "comedy", titleKey: "row_comedy", path: "/discover/movie", params: { with_genres: 35, sort_by: "popularity.desc" } },
  { id: "animation", titleKey: "row_animation", path: "/discover/movie", params: { with_genres: 16, sort_by: "popularity.desc" } },
  { id: "romance", titleKey: "row_romance", path: "/discover/movie", params: { with_genres: 10749, sort_by: "popularity.desc" } },
  { id: "airing", titleKey: "row_airing", path: "/tv/airing_today" },
];

const $ = (sel) => document.querySelector(sel);

function placeholderImage(label) {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'><rect width='100%' height='100%' fill='%231e1e2b'/><text x='50%25' y='50%25' fill='%23555a6a' font-family='sans-serif' font-size='20' text-anchor='middle' dominant-baseline='middle'>" +
    (label || "No Image") +
    "</text></svg>";
  return "data:image/svg+xml," + svg;
}

function img(path, size) {
  return path ? IMG_BASE + size + path : placeholderImage("No Image");
}

const LANG_REGION = { en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", tr: "tr-TR" };

async function tmdb(path, params = {}) {
  const url = new URL(API_BASE + path);
  url.searchParams.set("api_key", apiKey);
  if (!params.language) params.language = LANG_REGION[lang()] || "en-US";
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error("INVALID_KEY");
    throw new Error(`TMDB request failed (${res.status})`);
  }
  return res.json();
}

function normalizeItem(r, forcedType) {
  return {
    id: r.id,
    media_type: r.media_type || forcedType || "movie",
    title: r.title || r.name || "Untitled",
    poster_path: r.poster_path,
    backdrop_path: r.backdrop_path,
    vote_average: r.vote_average || 0,
    date: r.release_date || r.first_air_date || "",
    overview: r.overview || "",
  };
}

async function loadGenres() {
  try {
    const [m, t] = await Promise.all([tmdb("/genre/movie/list"), tmdb("/genre/tv/list")]);
    m.genres.forEach((g) => (genreMaps.movie[g.id] = g.name));
    t.genres.forEach((g) => (genreMaps.tv[g.id] = g.name));
  } catch (_) {}
}

function year(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : "";
}

function rating(v) {
  return v ? v.toFixed(1) : "—";
}

function bookmarkSvg() {
  return '<svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>';
}

function cardHTML(item, opts = {}) {
  const active = inList(item.id) ? " active" : "";
  const epBadge = item.episode ? `<div class="card-ep-badge">S${item.season || 1} · E${item.episode}</div>` : "";
  const menu = opts.removable
    ? `<button class="card-menu-btn" aria-label="More options" aria-haspopup="true">⋮</button>
       <div class="card-menu">
         <button class="card-menu-item" data-remove-continue-id="${item.id}" type="button">Remove from Continue Watching</button>
       </div>`
    : "";
  return `
    <article class="card${opts.removable ? " has-menu" : ""}" data-type="${item.media_type}" data-id="${item.id}">
      <img class="card-poster" loading="lazy" src="${img(item.poster_path, "w500")}" alt="${escapeHtml(item.title)}" onerror="this.onerror=null;this.src=placeholderImage()">
      ${item.progressPct ? `<div class="card-progress"><span style="width:${item.progressPct}%"></span></div>` : ""}
      ${epBadge}
      ${menu}
      <button class="bookmark-btn${active}" title="Add to My List" aria-label="Toggle watchlist">${bookmarkSvg()}</button>
      <div class="card-info">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-sub">
          <span class="card-rating">★ ${rating(item.vote_average)}</span>
          <span>${year(item.date)}</span>
        </div>
      </div>
    </article>`;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : str;
  return d.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function skeletonRow(count = 8) {
  return Array.from({ length: count }, () => '<div class="skeleton-card"></div>').join("");
}

function buildRowSection(rowDef) {
  const section = document.createElement("section");
  section.className = "row-section";
  section.dataset.rowId = rowDef.id;
  section.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">${escapeHtml(t(rowDef.titleKey))}</h2>
    </div>
    <div class="row-body">
      <button class="row-nav prev" aria-label="Scroll left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
      <div class="row-scroller">${skeletonRow()}</div>
      <button class="row-nav next" aria-label="Scroll right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></button>
    </div>`;
  return section;
}

function fillRow(section, items, opts = {}) {
  const scroller = section.querySelector(".row-scroller");
  scroller.innerHTML = items.map((item) => cardHTML(item, opts)).join("");
  const header = section.querySelector(".row-header");
  let countEl = header.querySelector(".row-count");
  if (!countEl) {
    countEl = document.createElement("span");
    countEl.className = "row-count";
    header.appendChild(countEl);
  }
  countEl.textContent = `${items.length} titles`;
}

function wireRowArrows(section) {
  const scroller = section.querySelector(".row-scroller");
  section.querySelectorAll(".row-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.classList.contains("next") ? 1 : -1;
      scroller.scrollBy({ left: dir * scroller.clientWidth * 0.85, behavior: "smooth" });
    });
  });
}

async function renderRows(filter) {
  const container = $("#rows");
  container.innerHTML = "";

  if (filter === "home") {
    const continueWatching = continueItems();
    if (continueWatching.length) {
      const cwSection = buildRowSection({ id: "continue", titleKey: "row_continue" });
      container.appendChild(cwSection);
      wireRowArrows(cwSection);
      fillRow(cwSection, continueWatching, { removable: true });
    }
  }

  if (filter === "list") {
    renderMyListView(container);
    return;
  }

  if (filter === "movie" || filter === "tv") {
    renderDiscoverGrid(filter, container);
    return;
  }

  for (const def of ROWS) {
    const section = buildRowSection(def);
    container.appendChild(section);
    wireRowArrows(section);
    try {
      const data = await tmdb(def.path, { language: "en-US", ...def.params });
      const items = data.results
        .map((r) => normalizeItem(r))
        .filter((i) => i.poster_path)
        .slice(0, 18);
      fillRow(section, items);
    } catch (err) {
      handleFetchError(err, section);
    }
  }
}

let discoverState = { type: "movie", genre: "", year: "", page: 1, totalPages: 1, loading: false };

function yearOptions() {
  const current = new Date().getFullYear() + 1;
  const opts = [];
  for (let y = current; y >= 1950; y--) opts.push(y);
  return opts;
}

function renderDiscoverGrid(type, container) {
  discoverState = { type, genre: "", year: "", page: 1, totalPages: 1, loading: false };

  const genreMap = genreMaps[type] || {};
  const genreOptionsHTML = Object.entries(genreMap)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`)
    .join("");
  const yearOptionsHTML = yearOptions()
    .map((y) => `<option value="${y}">${y}</option>`)
    .join("");

  const section = document.createElement("section");
  section.className = "discover-view";
  section.innerHTML = `
    <div class="discover-filterbar">
      <select id="discover-genre">
        <option value="">${t("filter_all_genres")}</option>
        ${genreOptionsHTML}
      </select>
      <select id="discover-year">
        <option value="">${t("filter_all_years")}</option>
        ${yearOptionsHTML}
      </select>
    </div>
    <div class="discover-grid" id="discover-grid">${skeletonRow(12)}</div>
    <div class="discover-load-wrap">
      <button class="btn btn-ghost hidden" id="discover-load-more">${t("filter_load_more")}</button>
    </div>`;
  container.appendChild(section);

  $("#discover-genre").addEventListener("change", (e) => {
    discoverState.genre = e.target.value;
    discoverState.page = 1;
    loadDiscoverPage(true);
  });
  $("#discover-year").addEventListener("change", (e) => {
    discoverState.year = e.target.value;
    discoverState.page = 1;
    loadDiscoverPage(true);
  });
  $("#discover-load-more").addEventListener("click", () => {
    discoverState.page += 1;
    loadDiscoverPage(false);
  });

  loadDiscoverPage(true);
}

async function loadDiscoverPage(reset) {
  if (discoverState.loading) return;
  discoverState.loading = true;
  const { type, genre, year, page } = discoverState;
  const grid = $("#discover-grid");
  const loadBtn = $("#discover-load-more");
  if (!grid) {
    discoverState.loading = false;
    return;
  }
  if (reset) grid.innerHTML = skeletonRow(12);
  loadBtn?.classList.add("hidden");

  const params = { sort_by: "popularity.desc", page };
  if (genre) params.with_genres = genre;
  if (year) params[type === "movie" ? "primary_release_year" : "first_air_date_year"] = year;

  try {
    const data = await tmdb(`/discover/${type}`, params);
    discoverState.totalPages = data.total_pages || 1;
    const items = data.results.map((r) => normalizeItem(r, type)).filter((i) => i.poster_path);

    if (reset) {
      if (!items.length) {
        grid.innerHTML = `<div class="empty-state"><h2>${t("filter_no_results")}</h2><p>${t("filter_no_results_sub")}</p></div>`;
      } else {
        grid.innerHTML = items.map(cardHTML).join("");
      }
    } else {
      grid.querySelectorAll(".skeleton-card").forEach((s) => s.remove());
      grid.insertAdjacentHTML("beforeend", items.map(cardHTML).join(""));
    }

    if (loadBtn) loadBtn.classList.toggle("hidden", discoverState.page >= discoverState.totalPages);
  } catch (err) {
    handleFetchError(err, grid);
  } finally {
    discoverState.loading = false;
  }
}

function renderMyListView(container) {
  const section = document.createElement("section");
  section.className = "search-results";
  section.style.padding = "140px 4% 60px";
  section.innerHTML = `
    <h2 class="results-title">${listTab === "list" ? t("list_watchlist") : t("list_tracking")}</h2>
    <div class="view-tabs">
      <button data-tab="list" class="${listTab === "list" ? "active" : ""}" type="button">${t("list_watchlist")}</button>
      <button data-tab="tracking" class="${listTab === "tracking" ? "active" : ""}" type="button">${t("list_tracking")}</button>
    </div>
    <div id="tab-content"></div>`;
  container.appendChild(section);
  section.querySelectorAll(".view-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      listTab = b.dataset.tab;
      renderRows("list");
    })
  );
  const content = section.querySelector("#tab-content");
  if (listTab === "tracking") renderTrackingTab(content);
  else renderWatchlistTab(content);
}

function renderWatchlistTab(content) {
  const list = getList();
  if (!list.length) {
    content.innerHTML = `
      <div class="empty-state">
        <h2>Your list is empty</h2>
        <p>Hover any poster and hit the bookmark icon to save it here.</p>
      </div>`;
    return;
  }
  content.innerHTML = `<p class="results-sub">${list.length} saved titles</p><div class="results-grid"></div>`;
  content.querySelector(".results-grid").innerHTML = list.map(cardHTML).join("");
}

function renderTrackingTab(content) {
  const entries = Object.entries(getTrackStore()).filter(([, t]) => t.title && t.poster_path);
  if (!entries.length) {
    content.innerHTML = `
      <div class="empty-state">
        <h2>Nothing tracked yet</h2>
        <p>Open any movie or show, then set a status and rating to track it here.</p>
      </div>`;
    return;
  }
  let html = "";
  TRACK_STATUSES.forEach((s) => {
    const items = entries.filter(([, t]) => t.status === s.id);
    if (!items.length) return;
    html += `<div class="tracking-section"><h3>${t(`st_${s.id}`)}<span class="count-chip">${items.length}</span></h3><div class="results-grid">${items
      .map(([id, t]) => trackCardHTML(id, t))
      .join("")}</div></div>`;
  });
  const ratedOnly = entries.filter(([, t]) => !t.status && t.rating);
  if (ratedOnly.length) {
    html += `<div class="tracking-section"><h3>Rated<span class="count-chip">${ratedOnly.length}</span></h3><div class="results-grid">${ratedOnly
      .map(([id, t]) => trackCardHTML(id, t))
      .join("")}</div></div>`;
  }
  content.innerHTML = html;
}

function trackCardHTML(id, item) {
  const w = getWatch(id);
  const pct = w.d ? Math.min(100, Math.round((w.t / w.d) * 100)) : 0;
  return `
    <article class="card" data-type="${item.media_type || "movie"}" data-id="${id}">
      <img class="card-poster" loading="lazy" src="${img(item.poster_path, "w500")}" alt="${escapeHtml(item.title)}" onerror="this.onerror=null;this.src=placeholderImage()">
      <span class="card-status-badge badge-${item.status}">${item.status ? t(`st_${item.status}`) : "★"}</span>
      ${item.rating ? `<span class="card-track-meta">${"★".repeat(item.rating)}</span>` : ""}
      ${pct ? `<div class="card-progress"><span style="width:${pct}%"></span></div>` : ""}
      <div class="card-info">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-sub">
          <span class="card-rating">★ ${rating(item.vote_average || 0)}</span>
          <span>${year(item.date || "")}</span>
        </div>
      </div>
    </article>`;
}

function handleFetchError(err, scope) {
  if (scope) scope.querySelectorAll(".skeleton-card").forEach((s) => s.remove());
  if (err.message === "INVALID_KEY") {
    localStorage.removeItem(LS_KEY);
    showSetup(true);
  }
}

async function startApp() {
  await loadGenres();
  await Promise.all([buildHero(), renderRows(currentFilter)]);
  appStarted = true;
}

let currentFilter = "home";

// --- Back-button navigation ---
// Every time a "layer" opens (a movie's detail popup, search results, the
// Episodes list, Settings, the Admin dashboard, or switching to a non-Home
// tab), we push one browser history entry for it. Pressing the phone/browser
// back button then closes just that one layer instead of leaving the site.
let navDepth = 0;
let suppressPopstate = false;

function pushNav() {
  navDepth++;
  history.pushState({ mtflixNav: navDepth }, "", location.href);
}

function popNavIfNeeded() {
  if (navDepth > 0) {
    navDepth--;
    suppressPopstate = true;
    history.back();
  }
}

function closeTopLayer() {
  if ($("#admin-overlay")) {
    $("#admin-overlay").remove();
    updateBodyScrollLock();
    return;
  }
  if ($("#episodes-overlay")) {
    $("#episodes-overlay").remove();
    updateBodyScrollLock();
    return;
  }
  if ($("#modal-overlay")) {
    closeModal();
    updateBodyScrollLock();
    return;
  }
  if (!$("#settings-screen").classList.contains("hidden")) {
    closeSettings();
    return;
  }
  if (!$("#search-results").classList.contains("hidden")) {
    exitSearch();
    return;
  }
  if (currentFilter !== "home") {
    setFilter("home");
    return;
  }
}

window.addEventListener("popstate", () => {
  if (suppressPopstate) {
    suppressPopstate = false;
    return;
  }
  navDepth = Math.max(0, navDepth - 1);
  closeTopLayer();
});

let bodyLockScrollY = 0;

function updateBodyScrollLock() {
  const shouldLock = !!($("#modal-overlay") || $("#episodes-overlay") || $("#admin-overlay"));
  const isLocked = document.body.classList.contains("body-locked");
  if (shouldLock && !isLocked) {
    bodyLockScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `-${bodyLockScrollY}px`;
    document.body.classList.add("body-locked");
  } else if (!shouldLock && isLocked) {
    document.body.classList.remove("body-locked");
    document.body.style.top = "";
    window.scrollTo(0, bodyLockScrollY);
  }
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".nav-links a, .bottom-nav a").forEach((a) =>
    a.classList.toggle("active", a.dataset.filter === filter)
  );
  const heroHidden = filter === "list" || filter === "movie" || filter === "tv";
  $("#hero").classList.toggle("hidden", heroHidden);
  $("#rows").classList.toggle("no-hero", heroHidden);
  renderRows(filter);
}

async function buildHero() {
  const hero = $("#hero");
  try {
    const data = await tmdb("/trending/all/day");
    heroItems = data.results
      .filter((r) => r.backdrop_path && (r.title || r.name))
      .map((r) => normalizeItem(r))
      .slice(0, 6);
    if (!heroItems.length) return;

    hero.innerHTML = `
      <div class="hero-backdrop" id="hero-backdrop"></div>
      <div class="hero-content" id="hero-content">
        <div class="hero-meta">
          <span class="hero-type-badge" id="hero-type">MOVIE</span>
          <span class="hero-rating" id="hero-rating"></span>
          <span class="muted" id="hero-year"></span>
        </div>
        <h1 class="hero-title" id="hero-title"></h1>
        <p class="hero-overview" id="hero-overview"></p>
        <div class="hero-buttons">
          <button class="btn btn-accent" id="hero-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Play</button>
          <button class="btn btn-ghost" id="hero-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>More Info</button>
        </div>
      </div>
      <div class="hero-dots" id="hero-dots"></div>`;

    const dots = $("#hero-dots");
    heroItems.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "hero-dot" + (i === 0 ? " active" : "");
      dot.addEventListener("click", () => setHeroSlide(i));
      dots.appendChild(dot);
    });

    setHeroSlide(0);
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      setHeroSlide((heroIndex + 1) % heroItems.length);
    }, 8000);

    $("#hero-play").addEventListener("click", () => {
      openDetail(heroItems[heroIndex].media_type, heroItems[heroIndex].id, true);
    });
    $("#hero-info").addEventListener("click", () => {
      openDetail(heroItems[heroIndex].media_type, heroItems[heroIndex].id, false);
    });
  } catch (err) {
    handleFetchError(err);
  }
}

function setHeroSlide(i) {
  heroIndex = i;
  const item = heroItems[i];
  const backdrop = $("#hero-backdrop");
  const content = $("#hero-content");
  backdrop.classList.remove("visible");
  content.classList.add("fading");
  setTimeout(() => {
    backdrop.style.backgroundImage = `url(${IMG_BASE}original${item.backdrop_path})`;
    backdrop.classList.add("visible");
    $("#hero-type").textContent = item.media_type === "tv" ? "SERIES" : "FILM";
    $("#hero-rating").textContent = `★ ${rating(item.vote_average)}`;
    $("#hero-year").textContent = year(item.date);
    $("#hero-title").textContent = item.title;
    $("#hero-overview").textContent = item.overview;
    content.classList.remove("fading");
  }, 120);
  document.querySelectorAll(".hero-dot").forEach((d, di) =>
    d.classList.toggle("active", di === i)
  );
}

function hasPlayer() {
  return true;
}

function buildPlayerUrl(type, id, season, episode, resumeSeconds) {
  const source = PLAYER_SOURCES[getPlayerSourceId()];
  const base =
    type === "tv"
      ? source.tv.replace("{id}", id).replace("{season}", season || 1).replace("{episode}", episode || 1)
      : source.movie.replace("{id}", id);
  const params = source.buildParams(type, resumeSeconds || 0);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

let heartbeatTimer = null;

// Fallback progress tracking that doesn't depend on the embed player
// cooperating at all: every 15s, estimate elapsed watch time from wall-clock
// time since the player was opened (plus wherever it resumed from), using
// TMDB's own runtime as the estimated duration. Real postMessage updates
// (when a source sends them) still apply on top of this via the same
// applyPlaybackUpdate function — whichever arrives last simply wins.
function startPlaybackHeartbeat(startSeconds) {
  clearInterval(heartbeatTimer);
  if (!currentPlayer) return;
  const heartbeatStart = Date.now();
  const player = currentPlayer;
  heartbeatTimer = setInterval(() => {
    if (currentPlayer !== player) {
      clearInterval(heartbeatTimer);
      return;
    }
    const elapsed = startSeconds + (Date.now() - heartbeatStart) / 1000;
    const duration = player.estimatedDurationSec || 0;
    applyPlaybackUpdate({
      id: player.id,
      mediaType: player.type,
      season: player.season,
      episode: player.episode,
      currentTime: elapsed,
      duration,
      finished: duration > 0 && elapsed >= duration - 15,
    });
  }, 15000);
}

function injectPlayer(url) {
  const heroArea = $("#modal-hero");
  if (!heroArea) return;
  heroArea.querySelector(".modal-trailer")?.remove();
  if (currentPlayer) startPlaybackHeartbeat(getWatch(currentPlayer.id).t || 0);
  const activeId = getPlayerSourceId();
  const wrap = document.createElement("div");
  wrap.className = "modal-trailer";
  wrap.innerHTML = `
    <iframe src="${url}" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>
    <div class="player-switcher">
      ${Object.entries(PLAYER_SOURCES)
        .map(
          ([id, src]) =>
            `<button type="button" class="player-source-btn${id === activeId ? " active" : ""}" data-source="${id}">${src.label}</button>`
        )
        .join("")}
    </div>`;
  heroArea.appendChild(wrap);
  wrap.querySelectorAll(".player-source-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.source === getPlayerSourceId() || !currentPlayer) return;
      setPlayerSourceId(btn.dataset.source);
      const watch = getWatch(currentPlayer.id);
      injectPlayer(
        buildPlayerUrl(currentPlayer.type, currentPlayer.id, currentPlayer.season || 1, currentPlayer.episode || 1, watch.t)
      );
    });
  });
}

async function openEpisodesView(data) {
  const seasons = (data.seasons || []).filter((s) => s.season_number > 0 && s.episode_count > 0);
  if (!seasons.length) return;
  let currentSeason = seasons[0].season_number;

  const overlay = document.createElement("div");
  overlay.className = "episodes-overlay";
  overlay.id = "episodes-overlay";
  overlay.innerHTML = `
    <div class="episodes-panel">
      <div class="episodes-head">
        <button class="episodes-back" id="episodes-back" aria-label="Back">←</button>
        <h2>Episodes</h2>
        <span class="episodes-showname">${escapeHtml(data.name || data.title || "")}</span>
      </div>
      <div class="episodes-progress" id="episodes-progress"></div>
      <div class="episodes-season-row">
        <span>Season</span>
        <select id="episodes-season-select">
          ${seasons.map((s) => `<option value="${s.season_number}">${escapeHtml(s.name)}</option>`).join("")}
        </select>
      </div>
      <div class="episodes-list" id="episodes-list">${skeletonRow(4)}</div>
    </div>`;
  $("#modal-root").appendChild(overlay);
  pushNav();
  updateBodyScrollLock();

  $("#episodes-back").addEventListener("click", () => {
    overlay.remove();
    popNavIfNeeded();
    updateBodyScrollLock();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      popNavIfNeeded();
      updateBodyScrollLock();
    }
  });
  $("#episodes-season-select").addEventListener("change", (e) => {
    currentSeason = Number(e.target.value);
    loadSeasonEpisodes(data, currentSeason);
  });

  await loadSeasonEpisodes(data, currentSeason);
}

async function loadSeasonEpisodes(data, seasonNumber) {
  const list = $("#episodes-list");
  const progressBox = $("#episodes-progress");
  if (!list) return;
  list.innerHTML = skeletonRow(4);

  let seasonData;
  try {
    seasonData = await tmdb(`/tv/${data.id}/season/${seasonNumber}`, {});
  } catch {
    list.innerHTML = `<div class="empty-state"><h2>Couldn't load episodes</h2><p>Check your connection and try again.</p></div>`;
    return;
  }

  const episodes = seasonData.episodes || [];
  const watchedCount = countWatchedInSeason(data.id, seasonNumber, episodes.length);
  const pct = episodes.length ? Math.round((watchedCount / episodes.length) * 100) : 0;

  if (progressBox) {
    progressBox.innerHTML = `
      <div class="ep-progress-card">
        <div class="ep-progress-top">
          <span class="ep-progress-label">YOUR SEASON PROGRESS</span>
          <span class="ep-progress-pct">${pct}%</span>
        </div>
        <p class="ep-progress-sub">${watchedCount} of ${episodes.length} episodes watched</p>
        <div class="ep-progress-track"><div class="ep-progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }

  list.innerHTML = episodes
    .map((ep) => {
      const watched = isEpWatched(data.id, seasonNumber, ep.episode_number);
      return `
      <div class="episode-row" data-ep="${ep.episode_number}" role="button" tabindex="0">
        <img class="episode-thumb" loading="lazy" src="${img(ep.still_path, "w300")}" alt="" onerror="this.onerror=null;this.src=placeholderImage('No Image');" />
        <div class="episode-info">
          <div class="episode-num">${String(ep.episode_number).padStart(2, "0")}</div>
          <div class="episode-title">${escapeHtml(ep.name || `Episode ${ep.episode_number}`)}</div>
          <div class="episode-desc">${escapeHtml(ep.overview || "No description available.")}</div>
        </div>
        <span class="episode-play" aria-hidden="true">›</span>
        <span class="episode-watched-toggle${watched ? " watched" : ""}" aria-hidden="true"></span>
      </div>`;
    })
    .join("");

  list.querySelectorAll(".episode-row").forEach((row) =>
    row.addEventListener("click", () => playEpisode(data, seasonNumber, Number(row.dataset.ep)))
  );
}

function playEpisode(data, season, episode) {
  if ($("#episodes-overlay")) {
    $("#episodes-overlay").remove();
    popNavIfNeeded();
    updateBodyScrollLock();
  }
  const watch = getWatch(data.id);
  if (currentPlayer) {
    currentPlayer.season = season;
    currentPlayer.episode = episode;
  }
  markEpWatched(data.id, season, episode);
  injectPlayer(buildPlayerUrl("tv", data.id, season, episode, watch.t));
}

async function openAdminDashboard() {
  const overlay = document.createElement("div");
  overlay.className = "admin-overlay";
  overlay.id = "admin-overlay";
  overlay.innerHTML = `
    <div class="admin-panel">
      <div class="admin-head">
        <button class="episodes-back" id="admin-close" aria-label="Close">←</button>
        <h2>Admin Dashboard</h2>
      </div>
      <input id="admin-search" class="admin-search" type="text" placeholder="Search by email…" autocomplete="off" />
      <div class="admin-stats" id="admin-stats"></div>
      <div class="admin-list" id="admin-list">${skeletonRow(4)}</div>
    </div>`;
  $("#modal-root").appendChild(overlay);
  pushNav();
  updateBodyScrollLock();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      popNavIfNeeded();
      updateBodyScrollLock();
    }
  });
  $("#admin-close").addEventListener("click", () => {
    overlay.remove();
    popNavIfNeeded();
    updateBodyScrollLock();
  });

  let allAccounts = [];
  try {
    const snap = await db.collection("users").get();
    allAccounts = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    $("#admin-list").innerHTML = `<div class="empty-state"><h2>Couldn't load accounts</h2><p>${escapeHtml(
      e.message || "Check your Firestore rules allow admin read access."
    )}</p></div>`;
    return;
  }

  allAccounts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const doReset = async (uid) => {
    if (!confirm("Reset this account's data? This clears their profiles, watchlists, and tracking, but their login keeps working — they'll just start fresh.")) return;
    const acc = allAccounts.find((a) => a.uid === uid);
    try {
      await db.collection("users").doc(uid).set({
        profiles: [],
        watchlist: {},
        progress: {},
        tracking: {},
        epwatch: {},
        email: acc?.email || "",
        createdAt: acc?.createdAt || "",
        lastSignIn: acc?.lastSignIn || "",
        updatedAt: Date.now(),
      });
      if (acc) {
        acc.profiles = [];
        acc.watchlist = {};
        acc.progress = {};
        acc.tracking = {};
        acc.epwatch = {};
      }
      showToast("Account data reset ✓");
      renderList(allAccounts);
    } catch (e) {
      alert("Couldn't reset account: " + (e.message || e));
    }
  };

  const doDelete = async (uid) => {
    if (!confirm("Delete this account's data completely? This cannot be undone. Note: their login will still work unless you also remove them in the Firebase Console (link on their card).")) return;
    try {
      await db.collection("users").doc(uid).delete();
      allAccounts = allAccounts.filter((a) => a.uid !== uid);
      showToast("Account data deleted ✓");
      renderList(allAccounts);
    } catch (e) {
      alert("Couldn't delete account: " + (e.message || e));
    }
  };

  const doRenameAccount = async (uid) => {
    const input = document.querySelector(`.admin-name-input[data-uid="${uid}"]`);
    if (!input) return;
    const val = input.value.trim();
    try {
      await db.collection("users").doc(uid).set({ displayNameOverride: val, updatedAt: Date.now() }, { merge: true });
      const acc = allAccounts.find((a) => a.uid === uid);
      if (acc) acc.displayNameOverride = val;
      showToast("Display name updated ✓");
    } catch (e) {
      alert("Couldn't update name: " + (e.message || e));
    }
  };

  const doPasswordReset = async (email) => {
    if (!email) return alert("This account has no email on file.");
    if (!confirm(`Send a password reset email to ${email}?`)) return;
    try {
      await auth.sendPasswordResetEmail(email);
      showToast("Password reset email sent ✓");
    } catch (e) {
      alert("Couldn't send reset email: " + (e.message || e));
    }
  };

  const saveProfilesForAccount = async (uid, profiles) => {
    await db.collection("users").doc(uid).set({ profiles, updatedAt: Date.now() }, { merge: true });
    const acc = allAccounts.find((a) => a.uid === uid);
    if (acc) acc.profiles = profiles;
  };

  const doRenameProfile = async (uid, pid) => {
    const input = document.querySelector(`.admin-profile-name-input[data-pid="${pid}"]`);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return alert("Name can't be empty.");
    const acc = allAccounts.find((a) => a.uid === uid);
    if (!acc) return;
    const profiles = (acc.profiles || []).map((p) => (p.id === pid ? { ...p, name: val.slice(0, 20) } : p));
    try {
      await saveProfilesForAccount(uid, profiles);
      showToast("Profile renamed ✓");
      renderList(allAccounts);
    } catch (e) {
      alert("Couldn't rename profile: " + (e.message || e));
    }
  };

  const doRemoveProfilePin = async (uid, pid) => {
    if (!confirm("Remove the PIN from this profile?")) return;
    const acc = allAccounts.find((a) => a.uid === uid);
    if (!acc) return;
    const profiles = (acc.profiles || []).map((p) => {
      if (p.id !== pid) return p;
      const { pinHash, pinSalt, ...rest } = p;
      return rest;
    });
    try {
      await saveProfilesForAccount(uid, profiles);
      showToast("PIN removed ✓");
      renderList(allAccounts);
    } catch (e) {
      alert("Couldn't remove PIN: " + (e.message || e));
    }
  };

  const doDeleteProfile = async (uid, pid) => {
    const acc = allAccounts.find((a) => a.uid === uid);
    if (!acc) return;
    const profile = (acc.profiles || []).find((p) => p.id === pid);
    if (!confirm(`Delete profile "${profile?.name || pid}"? This also removes its watchlist and tracking.`)) return;
    const profiles = (acc.profiles || []).filter((p) => p.id !== pid);
    const watchlist = { ...(acc.watchlist || {}) };
    delete watchlist[pid];
    const progress = { ...(acc.progress || {}) };
    delete progress[pid];
    const tracking = { ...(acc.tracking || {}) };
    delete tracking[pid];
    const epwatch = { ...(acc.epwatch || {}) };
    delete epwatch[pid];
    try {
      await db.collection("users").doc(uid).set(
        { profiles, watchlist, progress, tracking, epwatch, updatedAt: Date.now() },
        { merge: true }
      );
      Object.assign(acc, { profiles, watchlist, progress, tracking, epwatch });
      showToast("Profile deleted ✓");
      renderList(allAccounts);
    } catch (e) {
      alert("Couldn't delete profile: " + (e.message || e));
    }
  };

  const renderList = (accounts) => {
    const totalProfiles = accounts.reduce((s, a) => s + (a.profiles?.length || 0), 0);
    const totalWatchlist = accounts.reduce(
      (s, a) => s + Object.values(a.watchlist || {}).reduce((n, arr) => n + (arr?.length || 0), 0),
      0
    );
    $("#admin-stats").innerHTML = `
      <div class="admin-stat"><span class="admin-stat-num">${accounts.length}</span><span class="admin-stat-label">Accounts</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${totalProfiles}</span><span class="admin-stat-label">Profiles</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${totalWatchlist}</span><span class="admin-stat-label">Watchlist items</span></div>`;

    if (!accounts.length) {
      $("#admin-list").innerHTML = `<div class="empty-state"><h2>No accounts found</h2></div>`;
      return;
    }

    $("#admin-list").innerHTML = accounts
      .map((a) => {
        const profiles = a.profiles || [];
        const wlCount = Object.values(a.watchlist || {}).reduce((n, arr) => n + (arr?.length || 0), 0);
        const trackCount = Object.values(a.tracking || {}).reduce(
          (n, obj) => n + Object.keys(obj || {}).length,
          0
        );
        const created = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—";
        const lastSeen = a.lastSignIn ? new Date(a.lastSignIn).toLocaleString() : "—";
        const selfAccount = isAdmin(a.email);
        return `
        <div class="admin-card">
          <div class="admin-card-top">
            <div>
              <div class="admin-email">${escapeHtml(a.email || "(no email)")}${selfAccount ? ' <span class="admin-you-tag">you</span>' : ""}</div>
              <div class="admin-uid">UID: ${escapeHtml(a.uid)}</div>
            </div>
            <div class="admin-dates">
              <div>Joined: ${created}</div>
              <div>Last sign-in: ${lastSeen}</div>
            </div>
          </div>

          <div class="admin-field-row">
            <label class="admin-field-label">Display name</label>
            <div class="admin-field-inline">
              <input class="admin-name-input" data-uid="${a.uid}" maxlength="30" placeholder="(uses account default)" value="${escapeHtml(a.displayNameOverride || "")}" />
              <button class="btn btn-ghost admin-mini-btn admin-name-save-btn" data-uid="${a.uid}" type="button">Save</button>
            </div>
          </div>

          <div class="admin-field-row">
            <label class="admin-field-label">Profiles</label>
            <div class="admin-profile-list">
              ${
                profiles.length
                  ? profiles
                      .map(
                        (p) => `
                <div class="admin-profile-row">
                  <input class="admin-profile-name-input" data-pid="${p.id}" maxlength="20" value="${escapeHtml(p.name || "")}" />
                  <div class="admin-profile-row-actions">
                    ${p.pinHash ? `<button class="admin-mini-btn admin-pin-remove-btn" data-uid="${a.uid}" data-pid="${p.id}" type="button" title="Remove PIN">🔓</button>` : ""}
                    <button class="admin-mini-btn admin-profile-save-btn" data-uid="${a.uid}" data-pid="${p.id}" type="button" title="Save name">💾</button>
                    <button class="admin-mini-btn admin-profile-delete-btn" data-uid="${a.uid}" data-pid="${p.id}" type="button" title="Delete profile">✕</button>
                  </div>
                </div>`
                      )
                      .join("")
                  : `<span class="admin-profile-chip empty">No profiles yet</span>`
              }
            </div>
          </div>

          <div class="admin-card-stats">
            <span>📺 ${wlCount} in watchlist</span>
            <span>📊 ${trackCount} tracked</span>
          </div>
          ${
            selfAccount
              ? `<p class="admin-self-note">This is your admin account.</p>`
              : `<div class="admin-card-actions">
                  <a class="admin-console-link" href="https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/users" target="_blank" rel="noopener">Manage login in Firebase Console ↗</a>
                  <div class="admin-card-buttons">
                    <button class="btn btn-ghost admin-pwreset-btn" data-email="${escapeHtml(a.email || "")}" type="button">Reset Password</button>
                    <button class="btn btn-ghost admin-reset-btn" data-uid="${a.uid}" type="button">Reset Data</button>
                    <button class="btn btn-accent admin-delete-btn" data-uid="${a.uid}" type="button">Delete Account</button>
                  </div>
                </div>`
          }
        </div>`;
      })
      .join("");

    $("#admin-list").querySelectorAll(".admin-reset-btn").forEach((b) =>
      b.addEventListener("click", () => doReset(b.dataset.uid))
    );
    $("#admin-list").querySelectorAll(".admin-delete-btn").forEach((b) =>
      b.addEventListener("click", () => doDelete(b.dataset.uid))
    );
    $("#admin-list").querySelectorAll(".admin-name-save-btn").forEach((b) =>
      b.addEventListener("click", () => doRenameAccount(b.dataset.uid))
    );
    $("#admin-list").querySelectorAll(".admin-pwreset-btn").forEach((b) =>
      b.addEventListener("click", () => doPasswordReset(b.dataset.email))
    );
    $("#admin-list").querySelectorAll(".admin-profile-save-btn").forEach((b) =>
      b.addEventListener("click", () => doRenameProfile(b.dataset.uid, b.dataset.pid))
    );
    $("#admin-list").querySelectorAll(".admin-pin-remove-btn").forEach((b) =>
      b.addEventListener("click", () => doRemoveProfilePin(b.dataset.uid, b.dataset.pid))
    );
    $("#admin-list").querySelectorAll(".admin-profile-delete-btn").forEach((b) =>
      b.addEventListener("click", () => doDeleteProfile(b.dataset.uid, b.dataset.pid))
    );
  };

  renderList(allAccounts);

  $("#admin-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return renderList(allAccounts);
    renderList(allAccounts.filter((a) => (a.email || "").toLowerCase().includes(q)));
  });
}

function getWatchStore() {
  try {
    return JSON.parse(localStorage.getItem(pKey(LS_PROGRESS))) || {};
  } catch {
    return {};
  }
}

function removeContinueWatchingCard(id) {
  const store = getWatchStore();
  delete store[String(id)];
  localStorage.setItem(pKey(LS_PROGRESS), JSON.stringify(store));
  scheduleCloudSync();

  const card = document.querySelector(`.row-section[data-row-id="continue"] .card[data-id="${id}"]`);
  const section = card?.closest(".row-section");
  card?.remove();
  if (!section) return;
  const remaining = section.querySelectorAll(".card").length;
  if (remaining === 0) {
    section.remove();
  } else {
    const countEl = section.querySelector(".row-count");
    if (countEl) countEl.textContent = `${remaining} titles`;
  }
}

function getEpWatchStore() {
  try {
    return JSON.parse(localStorage.getItem(pKey(LS_EPWATCH))) || {};
  } catch {
    return {};
  }
}

function isEpWatched(showId, season, ep) {
  return !!getEpWatchStore()[`${showId}_s${season}e${ep}`];
}

function markEpWatched(showId, season, ep) {
  const store = getEpWatchStore();
  store[`${showId}_s${season}e${ep}`] = true;
  localStorage.setItem(pKey(LS_EPWATCH), JSON.stringify(store));
  scheduleCloudSync();
}

function nextEpisodeOf(player, season, episode) {
  const counts = player.seasonEpisodeCounts || {};
  const epCount = counts[season];
  if (!epCount) {
    // Episode counts unavailable — fall back to a naive same-season increment.
    return { season, episode: episode + 1 };
  }
  if (episode < epCount) return { season, episode: episode + 1 };
  if (counts[season + 1] != null) return { season: season + 1, episode: 1 };
  return null;
}

function countWatchedInSeason(showId, season, totalEpisodes) {
  const store = getEpWatchStore();
  let n = 0;
  for (let i = 1; i <= totalEpisodes; i++) {
    if (store[`${showId}_s${season}e${i}`]) n++;
  }
  return n;
}

function getWatch(id) {
  return getWatchStore()[String(id)] || { t: 0, d: 0 };
}

function fmtTime(total) {
  total = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function continueItems() {
  return Object.entries(getWatchStore())
    .filter(([, w]) => (w.t > 30 || w.upNext) && w.title && w.poster_path)
    .map(([id, w]) => ({
      id: Number(id),
      media_type: w.media_type || "movie",
      title: w.title,
      poster_path: w.poster_path,
      backdrop_path: w.backdrop_path,
      vote_average: 0,
      date: "",
      overview: "",
      season: w.season,
      episode: w.episode,
      progressPct: w.d ? Math.min(100, Math.round((w.t / w.d) * 100)) : 0,
    }));
}

async function openDetail(type, id, autoplayTrailer) {
  const hadModal = !!$("#modal-overlay");
  closeModal();
  if (hadModal) popNavIfNeeded();
  let data;
  try {
    data = await tmdb(`/${type}/${id}`, {
      language: "en-US",
      append_to_response: "credits,videos,similar",
    });
  } catch (err) {
    handleFetchError(err);
    return;
  }

  const title = data.title || data.name || "Untitled";
  const resumeWatch = getWatch(data.id);
  const seasonEpisodeCounts = {};
  if (type === "tv") {
    (data.seasons || []).forEach((s) => {
      if (s.season_number > 0) seasonEpisodeCounts[s.season_number] = s.episode_count;
    });
  }
  const estimatedDurationSec =
    type === "tv"
      ? (data.episode_run_time && data.episode_run_time[0] ? data.episode_run_time[0] : 0) * 60
      : (data.runtime || 0) * 60;
  currentPlayer = {
    type,
    id,
    title,
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    season: type === "tv" ? resumeWatch.season || 1 : 1,
    episode: type === "tv" ? resumeWatch.episode || 1 : 1,
    seasonEpisodeCounts,
    estimatedDurationSec,
  };
  const tagline = data.tagline || "";
  const date = data.release_date || data.first_air_date || "";
  const runtime = data.runtime
    ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
    : data.episode_run_time && data.episode_run_time.length
    ? `${data.episode_run_time[0]}m per ep`
    : "";
  const seasons = data.number_of_seasons ? `${data.number_of_seasons} season${data.number_of_seasons > 1 ? "s" : ""}` : "";
  const genres = (data.genres || []).map((g) => `<span class="genre-pill">${g.name}</span>`).join("");
  const cast = (data.credits?.cast || []).slice(0, 6);
  const similar = (data.similar?.results || [])
    .filter((s) => s.poster_path)
    .slice(0, 12)
    .map((s) => normalizeItem(s, type));

  const trailer =
    (data.videos?.results || []).find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official
    ) ||
    (data.videos?.results || []).find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    (data.videos?.results || []).find((v) => v.site === "YouTube");

  const inMyList = inList(data.id);
  const watch = resumeWatch;
  const trackNow = getTrack(data.id);
  const canStream = hasPlayer();
  const seasonsForPicker =
    type === "tv" ? (data.seasons || []).filter((s) => s.season_number > 0 && s.episode_count > 0) : [];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-hero" style="background-image:url(${img(data.backdrop_path, "w1280")})" id="modal-hero">
        <button class="modal-close" id="modal-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-title-row">
          <div>
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            ${tagline ? `<p class="modal-tagline">“${escapeHtml(tagline)}”</p>` : ""}
            <div class="modal-facts">
              <span class="match">${Math.round((data.vote_average || 0) * 10)}% Match</span>
              <span class="fact-rating">★ ${rating(data.vote_average)}</span>
              ${date ? `<span>${year(date)}</span>` : ""}
              ${runtime ? `<span>${runtime}</span>` : ""}
              ${seasons ? `<span>${seasons}</span>` : ""}
              <span class="fact-border">HD</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          ${
            canStream
              ? `<button class="btn btn-accent" id="play-now"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>${watch.t > 30 ? t("hdr_resume") : t("hdr_play")}</button>`
              : ""
          }
          ${
            canStream && type === "tv" && seasonsForPicker.length
              ? `<button class="btn btn-ghost" id="open-episodes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>Episodes</button>`
              : ""
          }
          ${
            trailer
              ? `<button class="btn btn-${canStream ? "ghost" : "accent"}" id="play-trailer"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>${t("hdr_trailer")}</button>`
              : ""
          }
          <button class="btn btn-ghost ${inMyList ? "in-list" : ""}" id="modal-list-btn" data-id="${data.id}">
            <svg viewBox="0 0 24 24" fill="${inMyList ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
            ${inMyList ? t("mylist_in") : t("mylist_add")}
          </button>
        </div>
        <div class="track-row">
          <div class="track-pills" id="track-pills">
            ${TRACK_STATUSES.map(
              (s) =>
                `<button class="track-pill${trackNow.status === s.id ? " active" : ""}" data-status="${s.id}" type="button">${t(`st_${s.id}`)}</button>`
            ).join("")}
          </div>
          <div class="star-rating" id="star-rating">
            ${[1, 2, 3, 4, 5]
              .map(
                (i) =>
                  `<button class="star${i <= (trackNow.rating || 0) ? " filled" : ""}" data-v="${i}" type="button" title="${i} star${i > 1 ? "s" : ""}">★</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="genre-pills">${genres}</div>
        <h3 class="modal-section-title">Overview</h3>
        <p style="color:#cfd2da;line-height:1.65;font-size:.95rem;">${escapeHtml(data.overview || "No overview available.")}</p>
        ${
          cast.length
            ? `<h3 class="modal-section-title">Cast</h3><div class="cast-list">${cast
                .map(
                  (c) => `
                <div class="cast-item">
                  <img class="cast-photo" loading="lazy" src="${img(c.profile_path, "w185")}" alt="${escapeHtml(c.name)}" onerror="this.onerror=null;this.src=placeholderImage('No Photo');this.style.objectFit='contain';this.style.padding='22px'">
                  <div class="cast-name">${escapeHtml(c.name)}</div>
                  <div class="cast-role">${escapeHtml(c.character || "")}</div>
                </div>`
                )
                .join("")}</div>`
            : ""
        }
        ${
          similar.length
            ? `<h3 class="modal-section-title">More Like This</h3><div class="similar-grid">${similar.map(cardHTML).join("")}</div>`
            : ""
        }
      </div>
    </div>`;

  $("#modal-root").appendChild(overlay);
  pushNav();
  updateBodyScrollLock();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
      popNavIfNeeded();
      updateBodyScrollLock();
    }
  });
  $("#modal-close").addEventListener("click", () => {
    closeModal();
    popNavIfNeeded();
    updateBodyScrollLock();
  });

  const playNow = () => {
    if (type === "tv") markEpWatched(data.id, currentPlayer.season, currentPlayer.episode);
    injectPlayer(buildPlayerUrl(type, data.id, currentPlayer.season, currentPlayer.episode, watch.t));
  };

  $("#play-now")?.addEventListener("click", playNow);
  $("#open-episodes")?.addEventListener("click", () => openEpisodesView(data));

  const trailerBtn = $("#play-trailer");
  if (trailerBtn) {
    trailerBtn.addEventListener("click", () => playTrailer(trailer.key));
  }

  if (autoplayTrailer) {
    if (canStream) playNow();
    else if (trailer) playTrailer(trailer.key);
  }

  $("#modal-list-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleList(normalizeItem({ ...data, media_type: type }));
    syncModalListButton(data.id);
  });

  const refreshTrackUI = () => {
    const t = getTrack(data.id);
    document.querySelectorAll("#track-pills .track-pill").forEach((b) =>
      b.classList.toggle("active", b.dataset.status === t.status)
    );
    document.querySelectorAll("#star-rating .star").forEach((b) =>
      b.classList.toggle("filled", Number(b.dataset.v) <= (t.rating || 0))
    );
  };
  document.querySelectorAll("#track-pills .track-pill").forEach((b) =>
    b.addEventListener("click", () => {
      const next = getTrack(data.id).status === b.dataset.status ? "" : b.dataset.status;
      setTrackEntry(data.id, { status: next }, { title, poster_path: data.poster_path, media_type: type });
      showToast(next ? `${t(`st_${next}`)} — “${title}”` : `“${title}” ✓`);
      refreshTrackUI();
    })
  );
  document.querySelectorAll("#star-rating .star").forEach((b) =>
    b.addEventListener("click", () => {
      const v = Number(b.dataset.v);
      const cur = getTrack(data.id).rating || 0;
      setTrackEntry(data.id, { rating: cur === v ? 0 : v }, { title, poster_path: data.poster_path, media_type: type });
      refreshTrackUI();
    })
  );
}

function playTrailer(key) {
  const heroArea = $("#modal-hero");
  if (!heroArea) return;
  heroArea.querySelector(".modal-trailer")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "modal-trailer";
  wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  heroArea.appendChild(wrap);
}

function syncModalListButton(id) {
  const btn = $("#modal-list-btn");
  if (!btn) return;
  const active = inList(id);
  btn.classList.toggle("in-list", active);
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${active ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
    ${active ? t("mylist_in") : t("mylist_add")}`;
}

function closeModal() {
  clearInterval(heartbeatTimer);
  $("#modal-overlay")?.remove();
}

function pKey(key) {
  return `${key}_${localStorage.getItem(LS_SESSION) || "guest"}`;
}

function profilesKey() {
  const uid = getAuthUserId();
  return LS_PROFILES + (uid && uid !== "guest" ? "_" + uid : "");
}

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(profilesKey())) || [];
  } catch {
    return [];
  }
}

function saveProfiles(list) {
  localStorage.setItem(profilesKey(), JSON.stringify(list));
  scheduleCloudSync();
}

let cloudSyncTimer = null;

function scheduleCloudSync() {
  const uid = getAuthUserId();
  if (!uid || uid === "guest") return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => pushCloudData(), 1200);
}

async function pushCloudData() {
  const uid = getAuthUserId();
  if (!uid || uid === "guest") return;
  const profiles = getProfiles();
  const watchlist = {};
  const progress = {};
  const tracking = {};
  const epwatch = {};
  profiles.forEach((p) => {
    try { watchlist[p.id] = JSON.parse(localStorage.getItem(`${LS_LIST}_${p.id}`)) || []; } catch { watchlist[p.id] = []; }
    try { progress[p.id] = JSON.parse(localStorage.getItem(`${LS_PROGRESS}_${p.id}`)) || {}; } catch { progress[p.id] = {}; }
    try { tracking[p.id] = JSON.parse(localStorage.getItem(`${LS_TRACK}_${p.id}`)) || {}; } catch { tracking[p.id] = {}; }
    try { epwatch[p.id] = JSON.parse(localStorage.getItem(`${LS_EPWATCH}_${p.id}`)) || {}; } catch { epwatch[p.id] = {}; }
  });
  try {
    await db.collection("users").doc(uid).set(
      {
        profiles,
        watchlist,
        progress,
        tracking,
        epwatch,
        email: auth.currentUser?.email || "",
        createdAt: auth.currentUser?.metadata?.creationTime || "",
        lastSignIn: auth.currentUser?.metadata?.lastSignInTime || "",
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("Cloud sync (push) failed", e);
  }
}

async function pullCloudData(uid) {
  try {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return;
    const data = snap.data();
    if (data.profiles) localStorage.setItem(LS_PROFILES + "_" + uid, JSON.stringify(data.profiles));
    if (data.watchlist) {
      Object.entries(data.watchlist).forEach(([pid, val]) =>
        localStorage.setItem(`${LS_LIST}_${pid}`, JSON.stringify(val))
      );
    }
    if (data.progress) {
      Object.entries(data.progress).forEach(([pid, val]) =>
        localStorage.setItem(`${LS_PROGRESS}_${pid}`, JSON.stringify(val))
      );
    }
    if (data.tracking) {
      Object.entries(data.tracking).forEach(([pid, val]) =>
        localStorage.setItem(`${LS_TRACK}_${pid}`, JSON.stringify(val))
      );
    }
    if (data.epwatch) {
      Object.entries(data.epwatch).forEach(([pid, val]) =>
        localStorage.setItem(`${LS_EPWATCH}_${pid}`, JSON.stringify(val))
      );
    }
    if (data.displayNameOverride) {
      localStorage.setItem(`cineverse_dispname_${uid}`, data.displayNameOverride);
    } else {
      localStorage.removeItem(`cineverse_dispname_${uid}`);
    }
  } catch (e) {
    console.error("Cloud sync (pull) failed", e);
  }
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function getAuthUserId() {
  return localStorage.getItem(LS_AUTH) || "";
}

function randomSalt() {
  if (window.crypto && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function hashPassword(password, salt) {
  if (window.crypto && crypto.subtle) {
    const data = new TextEncoder().encode(salt + password);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 5381;
  const str = salt + password;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return "f" + h.toString(16);
}

function friendlyAuthError(err) {
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a bit and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  return map[err.code] || "Something went wrong. Please try again.";
}

function initAuth() {
  auth.onAuthStateChanged(async (fbUser) => {
    if (fbUser) {
      const verified = await isCodeVerified(fbUser.uid);
      if (!verified) {
        showEmailVerifyGate(fbUser);
        return;
      }
      localStorage.setItem(LS_AUTH, fbUser.uid);
      await pullCloudData(fbUser.uid);
      const nameOverride = localStorage.getItem(`cineverse_dispname_${fbUser.uid}`);
      const user = {
        id: fbUser.uid,
        name: nameOverride || fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "User"),
        email: fbUser.email || "",
      };
      enterAfterAuth(user);
    } else if (getAuthUserId() === "guest") {
      applyUserChrome({ id: "guest", name: "Guest", email: "" });
      enterGuestSession();
    } else {
      localStorage.removeItem(LS_AUTH);
      showAuthScreen("signin");
    }
  });
}

function wireAuth() {
  $("#tab-signin").addEventListener("click", () => switchAuthTab("signin"));
  $("#tab-signup").addEventListener("click", () => switchAuthTab("signup"));
  $("#form-signin").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSignIn();
  });
  $("#form-signup").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSignUp();
  });
  $("#guest-btn").addEventListener("click", continueAsGuest);
  $("#forgot-pass-btn").addEventListener("click", handleForgotPassword);
}

async function handleForgotPassword() {
  const email = $("#signin-email").value.trim().toLowerCase();
  if (!email) {
    authError("signin", "Enter your email above first, then tap \"Forgot password?\" again.");
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    authError("signin", "");
    showToast("Password reset email sent — check your inbox (and spam folder) ✓");
  } catch (err) {
    authError("signin", friendlyAuthError(err));
  }
}

function switchAuthTab(tab) {
  $("#tab-signin").classList.toggle("active", tab === "signin");
  $("#tab-signup").classList.toggle("active", tab === "signup");
  $("#form-signin").classList.toggle("hidden", tab !== "signin");
  $("#form-signup").classList.toggle("hidden", tab !== "signup");
  $("#form-verify").classList.add("hidden");
  authError("signin", "");
  authError("signup", "");
}

function showAuthScreen(tab) {
  $("#auth-screen").classList.remove("hidden");
  switchAuthTab(tab || "signin");
}

function authError(form, msg) {
  const el = $(`#${form}-error`);
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

async function handleSignIn() {
  const email = $("#signin-email").value.trim().toLowerCase();
  const pass = $("#signin-pass").value;
  const remember = $("#signin-remember")?.checked !== false;
  if (!email || !pass) {
    authError("signin", "Please enter your email and password.");
    return;
  }
  try {
    await auth.setPersistence(
      remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
    );
    await auth.signInWithEmailAndPassword(email, pass);
    // onAuthStateChanged takes over from here
  } catch (err) {
    authError("signin", friendlyAuthError(err));
  }
}

async function handleSignUp() {
  const name = $("#signup-name").value.trim();
  const email = $("#signup-email").value.trim().toLowerCase();
  const pass = $("#signup-pass").value;
  const confirm = $("#signup-confirm").value;
  if (!name) return authError("signup", "Please enter a display name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authError("signup", "Please enter a valid email address.");
  if (pass.length < 6) return authError("signup", "Password must be at least 6 characters.");
  if (pass !== confirm) return authError("signup", "Passwords do not match.");
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    // onAuthStateChanged takes over from here
  } catch (err) {
    authError("signup", friendlyAuthError(err));
  }
}

function continueAsGuest() {
  localStorage.setItem(LS_AUTH, "guest");
  $("#auth-screen").classList.add("hidden");
  applyUserChrome({ id: "guest", name: "Guest", email: "" });
  enterGuestSession();
}

function enterGuestSession() {
  let profiles = getProfiles();
  if (!profiles.length) {
    profiles = [{ id: "p_main", name: "Guest", g: 0 }];
    saveProfiles(profiles);
  }
  enterApp(profiles[0].id);
}

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name[0]}${"*".repeat(Math.max(3, name.length - 1))}@${domain}`;
}

function authErrorVerify(msg) {
  const el = $("#verify-error");
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

async function isCodeVerified(uid) {
  try {
    const snap = await db.collection("users").doc(uid).get();
    return !!(snap.exists && snap.data().codeVerified);
  } catch {
    return false;
  }
}

async function markCodeVerified(uid) {
  await db.collection("users").doc(uid).set({ codeVerified: true }, { merge: true });
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function emailDeliveryEnabled() {
  return !!(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID);
}

function initEmailDelivery() {
  if (emailDeliveryEnabled() && window.emailjs) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
}

async function sendVerificationEmail(email, code, minutes) {
  if (!emailDeliveryEnabled() || !window.emailjs) return { sent: false };
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { to_email: email, code, minutes });
    return { sent: true };
  } catch (err) {
    console.error("EmailJS send failed:", err);
    return { sent: false, error: true };
  }
}

function renderDemoEmail(code, minutes) {
  $("#demo-email-body").innerHTML = `
    <p><strong>Hi!</strong></p>
    <p>Your MTFlix verification code is:</p>
    <div class="code-big">${code}</div>
    <p>This code expires in ${minutes} minutes. If you didn't request it, you can ignore this email.</p>
    <p class="muted">— The MTFlix Team</p>`;
}

let pendingVerifyCode = null;

async function deliverVerificationCode(fbUser) {
  const code = generateVerificationCode();
  pendingVerifyCode = { uid: fbUser.uid, code, expiresAt: Date.now() + 10 * 60 * 1000 };
  const note = $("#verify-sent-note");
  const demoWrap = $("#demo-email-wrap");
  note.classList.add("hidden");
  demoWrap.classList.add("hidden");
  const result = await sendVerificationEmail(fbUser.email, code, 10);
  if (result.sent) {
    note.textContent = `We just emailed a code to ${maskEmail(fbUser.email || "")}. Check your inbox (and spam folder).`;
    note.classList.remove("hidden");
    return;
  }
  if (result.error) {
    note.textContent = "Couldn't send the email — showing your code below instead.";
    note.classList.remove("hidden");
  }
  renderDemoEmail(code, 10);
  demoWrap.classList.remove("hidden");
}

function clearVerifyCodeBoxes() {
  $("#verify-code-row").querySelectorAll(".code-box").forEach((b) => (b.value = ""));
  $("#verify-code-row").querySelector(".code-box")?.focus();
}

async function showEmailVerifyGate(fbUser) {
  $("#auth-screen").classList.remove("hidden");
  $("#form-signin").classList.add("hidden");
  $("#form-signup").classList.add("hidden");
  $("#tab-signin").classList.remove("active");
  $("#tab-signup").classList.remove("active");
  $("#form-verify").classList.remove("hidden");
  $("#verify-sub").textContent = "We sent a 6-digit code to " + maskEmail(fbUser.email || "") + ".";
  authErrorVerify("");

  const submitCode = async (code) => {
    authErrorVerify("");
    if (!pendingVerifyCode || pendingVerifyCode.uid !== fbUser.uid || Date.now() > pendingVerifyCode.expiresAt) {
      authErrorVerify("This code has expired. Tap “Resend code” to get a new one.");
      clearVerifyCodeBoxes();
      return;
    }
    if (code !== pendingVerifyCode.code) {
      authErrorVerify("Incorrect code. Please check and try again.");
      clearVerifyCodeBoxes();
      return;
    }
    pendingVerifyCode = null;
    await markCodeVerified(fbUser.uid);
    $("#form-verify").classList.add("hidden");
    localStorage.setItem(LS_AUTH, fbUser.uid);
    await pullCloudData(fbUser.uid);
    enterAfterAuth({
      id: fbUser.uid,
      name: fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "User"),
      email: fbUser.email || "",
    });
  };

  buildCodeRow($("#verify-code-row"), 6, submitCode, false);
  $("#verify-continue-btn").onclick = () => submitCode(collectDigits($("#verify-code-row")));

  $("#resend-btn").onclick = async () => {
    authErrorVerify("");
    clearVerifyCodeBoxes();
    await deliverVerificationCode(fbUser);
  };

  $("#verify-back").onclick = () => {
    auth.signOut();
    localStorage.removeItem(LS_AUTH);
    $("#form-verify").classList.add("hidden");
    switchAuthTab("signin");
  };

  await deliverVerificationCode(fbUser);
}

function signOut() {
  const uid = getAuthUserId();
  localStorage.removeItem(LS_AUTH);
  if (uid && uid !== "guest") {
    auth.signOut().finally(() => location.reload());
  } else {
    location.reload();
  }
}


function signOut() {
  const uid = getAuthUserId();
  localStorage.removeItem(LS_AUTH);
  if (uid && uid !== "guest") {
    auth.signOut().finally(() => location.reload());
  } else {
    location.reload();
  }
}

function enterAfterAuth(user) {
  $("#auth-screen").classList.add("hidden");
  applyUserChrome(user);
  initProfiles();
}

function applyUserChrome(user) {
  const head = $("#menu-user-head");
  if (!head) return;
  head.innerHTML = `<strong>${escapeHtml(user.name)}</strong>${user.email ? `<span>${escapeHtml(user.email)}</span>` : "<span>Browsing as guest</span>"}`;
  const isGuest = user.id === "guest";
  $("#menu-manage")?.classList.toggle("hidden", isGuest);
  $("#menu-switch")?.classList.toggle("hidden", isGuest);
  $("#menu-admin")?.classList.toggle("hidden", !isAdmin(user.email));
  const signoutBtn = $("#menu-signout");
  if (signoutBtn) {
    signoutBtn.dataset.i18n = isGuest ? "auth_in" : "menu_signout";
    signoutBtn.textContent = t(signoutBtn.dataset.i18n);
  }
}

function wireAvatarMenu() {
  $("#nav-avatar").addEventListener("click", (e) => {
    e.stopPropagation();
    $("#avatar-menu").classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".avatar-wrap")) {
      $("#avatar-menu")?.classList.add("hidden");
    }
  });
  $("#menu-switch").addEventListener("click", () => openGate());
  $("#menu-signout").addEventListener("click", () => signOut());
  $("#menu-settings").addEventListener("click", () => {
    $("#avatar-menu").classList.add("hidden");
    openSettings("playback");
  });
  $("#menu-manage").addEventListener("click", () => {
    $("#avatar-menu").classList.add("hidden");
    gateEditing = true;
    renderGate(false);
  });
  $("#menu-admin")?.addEventListener("click", () => {
    $("#avatar-menu").classList.add("hidden");
    openAdminDashboard();
  });
  $("#settings-close").addEventListener("click", () => {
    closeSettings();
    popNavIfNeeded();
  });
  document.querySelectorAll(".side-link").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".side-link").forEach((x) =>
        x.classList.toggle("active", x === b)
      );
      renderSettings(b.dataset.sec);
    })
  );
}

function openSettings(section) {
  $("#settings-screen").classList.remove("hidden");
  pushNav();
  document.querySelectorAll(".side-link").forEach((b) =>
    b.classList.toggle("active", b.dataset.sec === section)
  );
  renderSettings(section);
}

function closeSettings() {
  $("#settings-screen").classList.add("hidden");
}

function renderSettings(section) {
  const content = $("#settings-content");
  if (section === "playback") renderPlaybackSettings(content);
  else if (section === "language") renderLanguageSettings(content);
  else if (section === "privacy") renderPrivacySettings(content);
}

function updateActiveProfile(patch) {
  const profiles = getProfiles();
  const profile = profiles.find((p) => p.id === localStorage.getItem(LS_SESSION));
  if (!profile) return null;
  Object.assign(profile, patch);
  saveProfiles(profiles);
  return profile;
}

function renderPlaybackSettings(content) {
  const profile = activeProfile();
  const on = profile?.autoplay !== false;
  content.innerHTML = `
    <h3 class="settings-h3">${t("sec_playback")}</h3>
    <div class="setting-row">
      <div>
        <div class="setting-name">${t("set_autoplay_label")}</div>
        <div class="setting-desc">${t("set_autoplay_desc")}</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="autoplay-toggle" ${on ? "checked" : ""} />
        <span class="slider"></span>
      </label>
    </div>`;
  $("#autoplay-toggle").addEventListener("change", (e) => {
    updateActiveProfile({ autoplay: e.target.checked });
    showToast(`${t("set_autoplay_label")}: ${e.target.checked ? "ON" : "OFF"}`);
  });
}

function renderLanguageSettings(content) {
  content.innerHTML = `
    <h3 class="settings-h3">${t("sec_language")}</h3>
    <p class="setting-desc" style="margin-bottom:18px;">${t("set_lang_desc")}</p>
    <div class="lang-list">
      ${LANGS.map(
        (l) =>
          `<button type="button" class="lang-option${l.id === lang() ? " active" : ""}" data-lang="${l.id}">${l.id === lang() ? "✓ " : ""}${l.label}</button>`
      ).join("")}
    </div>`;
  content.querySelectorAll(".lang-option").forEach((b) =>
    b.addEventListener("click", async () => {
      updateActiveProfile({ lang: b.dataset.lang });
      applyI18n();
      if (appStarted && apiKey) await startApp();
      openSettings("language");
    })
  );
}

function renderPrivacySettings(content) {
  const profile = activeProfile();
  const uidNow = getAuthUserId();
  const user = uidNow && uidNow !== "guest" ? auth.currentUser : null;
  const pinHtml = `
    <div class="privacy-card">
      <div class="privacy-head">🔒 ${t("pin_enter_title")}</div>
      <p class="setting-desc">${profile?.pinHash ? t("pin_enabled_on") : t("privacy_pin_desc")}</p>
      ${
        profile?.pinHash
          ? `
        <input id="pin-cur" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_current")}" />
        <input id="pin-new" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_new")}" />
        <input id="pin-confirm" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_confirm")}" />
        <div class="panel-actions">
          <button type="button" class="btn btn-ghost" id="pin-disable-btn">${t("pin_disable")}</button>
          <button type="button" class="btn btn-accent" id="pin-change-btn">${t("pin_change")}</button>
        </div>`
          : `
        <input id="pin-new" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_new")}" />
        <input id="pin-confirm" class="settings-input" type="password" inputmode="numeric" maxlength="4" placeholder="${t("pin_confirm")}" />
        <button type="button" class="btn btn-accent" id="pin-enable-btn">${t("pin_enable")}</button>`
      }
      <p class="auth-error hidden" id="pin-error-s"></p>
    </div>`;

  const pwHtml = user
    ? `
    <div class="privacy-card">
      <div class="privacy-head">🔑 ${t("pw_update")}</div>
      <p class="setting-desc">${t("pw_desc")}</p>
      <input id="pw-cur" class="settings-input" type="password" placeholder="${t("pw_current")}" autocomplete="current-password" />
      <input id="pw-new" class="settings-input" type="password" placeholder="${t("pw_new")}" autocomplete="new-password" />
      <input id="pw-confirm" class="settings-input" type="password" placeholder="${t("pw_confirm")}" autocomplete="new-password" />
      <p class="auth-error hidden" id="pw-error-s"></p>
      <button type="button" class="btn btn-accent" id="pw-update-btn">${t("pw_update")}</button>
    </div>`
    : "";

  content.innerHTML = `
    <h3 class="settings-h3">${t("sec_privacy")}</h3>
    ${pinHtml}
    ${pwHtml}`;

  const errPin = (msg) => {
    const el = $("#pin-error-s");
    el.textContent = msg;
    el.classList.toggle("hidden", !msg);
  };
  const validPin = (v) => /^\d{4}$/.test(v);

  const enableBtn = $("#pin-enable-btn");
  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      const a = $("#pin-new").value.trim();
      const b = $("#pin-confirm").value.trim();
      if (!validPin(a)) return errPin(t("pin_new"));
      if (a !== b) return errPin(t("pw_confirm"));
      const salt = randomSalt();
      updateActiveProfile({ pinSalt: salt, pinHash: await hashPassword(a, salt) });
      showToast("🔒 " + t("pin_enable"));
      renderSettings("privacy");
    });
  }
  const changeBtn = $("#pin-change-btn");
  if (changeBtn) {
    changeBtn.addEventListener("click", async () => {
      const cur = $("#pin-cur").value.trim();
      const curHash = await hashPassword(cur, profile.pinSalt || "");
      if (curHash !== profile.pinHash) return errPin(t("pin_current"));
      const a = $("#pin-new").value.trim();
      const b = $("#pin-confirm").value.trim();
      if (!validPin(a)) return errPin(t("pin_new"));
      if (a !== b) return errPin(t("pw_confirm"));
      const salt = randomSalt();
      updateActiveProfile({ pinSalt: salt, pinHash: await hashPassword(a, salt) });
      showToast(t("pin_change") + " ✓");
      renderSettings("privacy");
    });
  }
  const disableBtn = $("#pin-disable-btn");
  if (disableBtn) {
    disableBtn.addEventListener("click", async () => {
      const cur = $("#pin-cur").value.trim();
      const curHash = await hashPassword(cur, profile.pinSalt || "");
      if (curHash !== profile.pinHash) return errPin(t("pin_current"));
      updateActiveProfile({ pinSalt: null, pinHash: null });
      showToast(t("pin_disable") + " ✓");
      renderSettings("privacy");
    });
  }

  const pwUpdateBtn = $("#pw-update-btn");
  if (pwUpdateBtn) {
    pwUpdateBtn.addEventListener("click", async () => {
      const err = (m) => {
        const el = $("#pw-error-s");
        el.textContent = m;
        el.classList.toggle("hidden", !m);
      };
      const cur = $("#pw-cur").value;
      const nw = $("#pw-new").value;
      const cf = $("#pw-confirm").value;
      const fbUser = auth.currentUser;
      if (!fbUser) return err("You must be signed in to change your password.");
      if (nw.length < 6) return err(t("auth_pass_min"));
      if (nw !== cf) return err(t("pw_confirm"));
      try {
        const credential = firebase.auth.EmailAuthProvider.credential(fbUser.email, cur);
        await fbUser.reauthenticateWithCredential(credential);
        await fbUser.updatePassword(nw);
        showToast(t("pw_update") + " ✓");
        renderSettings("privacy");
      } catch (e) {
        err(friendlyAuthError(e));
      }
    });
  }
}

function openGate() {
  $("#avatar-menu").classList.add("hidden");
  gateEditing = false;
  renderGate(false);
}

function getTrackStore() {
  try {
    return JSON.parse(localStorage.getItem(pKey(LS_TRACK))) || {};
  } catch {
    return {};
  }
}

function getTrack(id) {
  return getTrackStore()[String(id)] || { status: "", rating: 0 };
}

function setTrackEntry(id, patch, meta) {
  const store = getTrackStore();
  const cur = store[String(id)] || { status: "", rating: 0 };
  store[String(id)] = { ...cur, ...patch };
  if (meta) {
    store[String(id)].title = meta.title;
    store[String(id)].poster_path = meta.poster_path;
    store[String(id)].media_type = meta.media_type;
  }
  if (!store[String(id)].status && !store[String(id)].rating) delete store[String(id)];
  localStorage.setItem(pKey(LS_TRACK), JSON.stringify(store));
  scheduleCloudSync();
}

function initProfiles() {
  const profiles = getProfiles();
  const uid = getAuthUserId();
  // Only run the old legacy-data migration for guest/local-only sessions.
  // Running it for a signed-in cloud account risks overwriting profiles
  // (and anything on them, like a PIN) that were just pulled down from Firestore
  // with a blank default profile — which then gets pushed back up, corrupting
  // the synced data for every device on that account.
  if (!profiles.length && (!uid || uid === "guest")) {
    const legacyList =
      localStorage.getItem(`${LS_LIST}_p_main`) || localStorage.getItem(LS_LIST);
    const legacyProgress =
      localStorage.getItem(`${LS_PROGRESS}_p_main`) || localStorage.getItem(LS_PROGRESS);
    if (legacyList || legacyProgress) {
      saveProfiles([{ id: "p_main", name: "Main", g: 0 }]);
      if (legacyList) localStorage.setItem(`${LS_LIST}_p_main`, legacyList);
      if (legacyProgress) localStorage.setItem(`${LS_PROGRESS}_p_main`, legacyProgress);
      localStorage.removeItem(LS_LIST);
      localStorage.removeItem(LS_PROGRESS);
    }
  }
  renderGate(false);
}

function renderGate(openAddForm) {
  const profiles = getProfiles();
  const grid = $("#profile-grid");
  grid.innerHTML = "";
  grid.classList.toggle("gate-editing", gateEditing);

  profiles.forEach((p) => {
    const tile = document.createElement("button");
    tile.className = "profile-item";
    tile.innerHTML = `
      <span class="profile-box">
        <span class="profile-initial">${escapeHtml((p.name || "?")[0].toUpperCase())}</span>
        <span class="profile-delete" title="Delete profile">✕</span>
        <span class="profile-pencil" title="Edit profile">✎</span>
      </span>
      <span class="profile-label">${escapeHtml(p.name)}</span>`;
    const boxEl = tile.querySelector(".profile-box");
    const tileBg = avatarBackground(p);
    if (tileBg) {
      tile.querySelector(".profile-initial").style.display = "none";
      boxEl.style.background = tileBg;
    } else {
      boxEl.style.background = AVATAR_GRADIENTS[(p.g ?? 0) % AVATAR_GRADIENTS.length];
    }
    if (p.pinHash) {
      const lock = document.createElement("span");
      lock.className = "profile-lock";
      lock.textContent = "🔒";
      boxEl.appendChild(lock);
    }
    tile.addEventListener("click", () => {
      if (gateEditing) {
        openProfileEditor(p.id);
        return;
      }
      if (p.pinHash) showPinScreen(p);
      else enterApp(p.id);
    });
    tile.querySelector(".profile-pencil").addEventListener("click", (e) => {
      e.stopPropagation();
      openProfileEditor(p.id);
    });
    tile.querySelector(".profile-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Delete profile “${p.name}” and all of its saved data?`)) {
        deleteProfile(p.id);
      }
    });
    grid.appendChild(tile);
  });

  const addTile = document.createElement("button");
  addTile.className = "profile-item add-tile";
  addTile.innerHTML = `
    <span class="profile-box"><span class="profile-initial">＋</span></span>
    <span class="profile-label">＋</span>`;
  addTile.addEventListener("click", () => openProfileEditor(null));
  grid.appendChild(addTile);

  $("#profile-gate").classList.remove("hidden");
  $("#gate-manage").textContent = gateEditing ? t("cancel") : t("gate_manage");
  $("#add-profile-panel").classList.add("hidden");
  $("#bottom-nav")?.classList.add("hidden");
}

function openProfileEditor(profileId) {
  const panel = $("#add-profile-panel");
  const profiles = getProfiles();
  const existing = profileId ? profiles.find((p) => p.id === profileId) : null;
  editingProfileId = profileId;

  editorState = existing
    ? {
        type: existing.avatar?.type === "dice" || existing.avatar?.type === "custom" ? existing.avatar.type : "color",
        g: existing.g ?? 0,
        style: existing.avatar?.style || DICE_STYLES[0],
        seed: existing.avatar?.seed || randomSeed(),
        data: existing.avatar?.data || null,
      }
    : { type: "dice", g: Math.floor(Math.random() * AVATAR_GRADIENTS.length), style: DICE_STYLES[Math.floor(Math.random() * DICE_STYLES.length)], seed: randomSeed(), data: null };

  panel.classList.remove("hidden");
  panel.innerHTML = `
    <h2>${existing ? t("profile_edit_title") : t("profile_add_title")}</h2>
    <input id="editor-name" type="text" maxlength="20" placeholder="${t("profile_name_ph")}" autocomplete="off" spellcheck="false" value="${existing ? escapeHtml(existing.name) : ""}" />
    <div class="editor-tabs">
      <button type="button" data-avtab="colors" class="${editorState.type === "color" ? "active" : ""}">${t("tab_colors")}</button>
      <button type="button" data-avtab="avatars" class="${editorState.type === "dice" ? "active" : ""}">${t("tab_avatars")}</button>
      <button type="button" data-avtab="custom" class="${editorState.type === "custom" ? "active" : ""}">${t("tab_custom")}</button>
    </div>
    <div class="swatch-row" id="editor-colors"></div>
    <div class="avatar-grid-wrap ${editorState.type === "dice" ? "" : "hidden"}" id="editor-avatars">
      <div class="avatar-grid" id="avatar-grid"></div>
      <button type="button" class="link-btn" id="random-avatar-btn">${t("btn_random")}</button>
    </div>
    <div class="custom-upload ${editorState.type === "custom" ? "" : "hidden"}" id="editor-custom">
      <div class="avatar-choice custom-preview ${editorState.type === "custom" && editorState.data ? "has-img" : ""}" id="custom-preview">
        ${editorState.type === "custom" && editorState.data ? `<img src="${editorState.data}" alt="" />` : "＋"}
      </div>
      <label class="btn btn-ghost file-btn" for="custom-file">${t("btn_upload")}</label>
      <input type="file" id="custom-file" accept="image/*" hidden />
    </div>
    <div class="panel-actions">
      ${
        existing
          ? `<button type="button" class="btn btn-ghost" id="editor-delete">${t("profile_delete")}</button>`
          : ""
      }
      <button type="button" class="btn btn-ghost" id="editor-cancel">${t("profile_cancel")}</button>
      <button type="button" class="btn btn-accent" id="editor-save">${t("profile_save")}</button>
    </div>`;

  renderEditorColors();
  renderEditorAvatars();
  wireCustomUpload();

  panel.querySelectorAll(".editor-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      const map = { colors: "color", avatars: "dice", custom: "custom" };
      editorState.type = map[b.dataset.avtab] || "color";
      panel.querySelectorAll(".editor-tabs button").forEach((x) =>
        x.classList.toggle("active", x === b)
      );
      $("#editor-colors").classList.toggle("hidden", editorState.type !== "color");
      $("#editor-avatars").classList.toggle("hidden", editorState.type !== "dice");
      $("#editor-custom").classList.toggle("hidden", editorState.type !== "custom");
    })
  );
  $("#random-avatar-btn").addEventListener("click", () => {
    editorState.style = DICE_STYLES[Math.floor(Math.random() * DICE_STYLES.length)];
    editorState.seed = randomSeed();
    renderEditorAvatars();
  });
  $("#editor-cancel").addEventListener("click", () => {
    panel.classList.add("hidden");
  });
  $("#editor-save").addEventListener("click", saveProfileEditor);
  const delBtn = $("#editor-delete");
  if (delBtn) {
    delBtn.addEventListener("click", () => {
      if (confirm(`Delete profile “${existing.name}” and all of its saved data?`)) {
        deleteProfile(existing.id);
      }
    });
  }
  $("#editor-name").focus();
}

function renderEditorColors() {
  const wrap = $("#editor-colors");
  wrap.innerHTML = "";
  wrap.classList.toggle("hidden", editorState.type !== "color");
  AVATAR_GRADIENTS.forEach((g, i) => {
    const s = document.createElement("button");
    s.type = "button";
    s.className = "swatch" + (editorState.type === "color" && editorState.g === i ? " active" : "");
    s.style.background = g;
    s.addEventListener("click", () => {
      editorState.type = "color";
      editorState.g = i;
      renderEditorColors();
    });
    wrap.appendChild(s);
  });
}

function renderEditorAvatars() {
  const grid = $("#avatar-grid");
  grid.innerHTML = "";
  grid.classList.remove("hidden");
  const seeds = [editorState.seed, ...Array.from({ length: 7 }, (_, i) => `${editorState.seed}${i}`)];
  seeds.forEach((seed, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const url = diceUrl(editorState.style, seed);
    btn.className =
      "avatar-choice" +
      (editorState.type === "dice" && i === 0 ? " active" : "");
    btn.style.background = `url("${url}") center / cover no-repeat`;
    btn.addEventListener("click", () => {
      editorState.type = "dice";
      editorState.seed = seed;
      grid.querySelectorAll(".avatar-choice").forEach((x, xi) =>
        x.classList.toggle("active", xi === i)
      );
    });
    grid.appendChild(btn);
  });
}

function wireCustomUpload() {
  const input = $("#custom-file");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      editorState.type = "custom";
      editorState.data = await fileToAvatarDataUrl(file);
      const preview = $("#custom-preview");
      preview.classList.add("has-img");
      preview.innerHTML = `<img src="${editorState.data}" alt="" />`;
    } catch {
      showToast("⚠ " + t("tab_custom"));
    }
    input.value = "";
  });
}

async function saveProfileEditor() {
  const nameInput = $("#editor-name");
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  const profiles = getProfiles();
  if (editingProfileId) {
    const p = profiles.find((x) => x.id === editingProfileId);
    if (p) {
      p.name = name.slice(0, 20);
      p.g = editorState.g ?? 0;
      delete p.avatar;
      if (editorState.type === "dice") p.avatar = { type: "dice", style: editorState.style, seed: editorState.seed };
      else if (editorState.type === "custom" && editorState.data) p.avatar = { type: "custom", data: editorState.data };
    }
    saveProfiles(profiles);
  } else {
    const profile = {
      id: "p_" + Date.now().toString(36),
      name: name.slice(0, 20),
      g: editorState.g ?? 0,
      lang: lang(),
      autoplay: true,
    };
    if (editorState.type === "dice") profile.avatar = { type: "dice", style: editorState.style, seed: editorState.seed };
    else if (editorState.type === "custom" && editorState.data) profile.avatar = { type: "custom", data: editorState.data };
    profiles.push(profile);
    saveProfiles(profiles);
  }
  applyProfileChrome();
  $("#add-profile-panel").classList.add("hidden");
  renderGate(false);
}

function deleteProfile(id) {
  saveProfiles(getProfiles().filter((p) => p.id !== id));
  localStorage.removeItem(`${LS_LIST}_${id}`);
  localStorage.removeItem(`${LS_PROGRESS}_${id}`);
  if (localStorage.getItem(LS_SESSION) === id) localStorage.removeItem(LS_SESSION);
  renderGate(false);
}

function enterApp(id) {
  localStorage.setItem(LS_SESSION, id);
  $("#profile-gate").classList.add("hidden");
  $("#pin-screen").classList.add("hidden");
  $("#bottom-nav")?.classList.remove("hidden");
  applyProfileChrome();
  applyI18n();
  closeModal();
  navDepth = 0;
  updateBodyScrollLock();
  $("#search-results").classList.add("hidden");
  $("#search-input").value = "";
  $("#rows").classList.remove("hidden");
  if (appStarted) {
    currentFilter = "home";
    document.querySelectorAll(".nav-links a").forEach((a) =>
      a.classList.toggle("active", a.dataset.filter === "home")
    );
    $("#hero").classList.remove("hidden");
    $("#rows").classList.remove("no-hero");
  }
  if (!apiKey) showSetup(false);
  else startApp();
}

let pinTarget = null;

function showPinScreen(profile) {
  pinTarget = profile;
  $("#profile-gate").classList.add("hidden");
  $("#pin-screen").classList.remove("hidden");
  $("#pin-sub").textContent = `“${profile.name}”`;
  buildCodeRow($("#pin-row"), 4, checkPin);
  authErrorPin("");
}

function buildCodeRow(rowEl, digits, onFull, masked = true) {
  rowEl.innerHTML = "";
  for (let i = 0; i < digits; i++) {
    const box = document.createElement("input");
    box.className = "code-box";
    box.type = masked ? "password" : "text";
    box.inputMode = "numeric";
    box.maxLength = 1;
    box.autocomplete = "off";
    box.setAttribute("aria-label", `Digit ${i + 1}`);
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      if (box.value && i < digits - 1) rowEl.children[i + 1].focus();
      if (collectDigits(rowEl).length === digits) onFull(collectDigits(rowEl));
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        rowEl.children[i - 1].focus();
        rowEl.children[i - 1].value = "";
        e.preventDefault();
      }
    });
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, digits);
      pasted.split("").forEach((d, di) => {
        if (rowEl.children[di]) rowEl.children[di].value = d;
      });
      rowEl.children[Math.min(pasted.length, digits - 1)]?.focus();
      if (pasted.length === digits) onFull(pasted);
    });
    rowEl.appendChild(box);
  }
  rowEl.querySelector(".code-box")?.focus();
}

function collectDigits(rowEl) {
  return Array.from(rowEl.children)
    .map((b) => b.value || "")
    .join("");
}

async function checkPin(pin) {
  if (!pinTarget) return;
  const hash = await hashPassword(pin, pinTarget.pinSalt || "");
  if (hash !== pinTarget.pinHash) {
    authErrorPin("Incorrect PIN. Try again.");
    $("#pin-row")
      .querySelectorAll(".code-box")
      .forEach((b) => (b.value = ""));
    $("#pin-row").querySelector(".code-box")?.focus();
    return;
  }
  const target = pinTarget;
  pinTarget = null;
  enterApp(target.id);
}

function authErrorPin(msg) {
  const el = $("#pin-error");
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

function applyProfileChrome() {
  const profile = getProfiles().find((p) => p.id === localStorage.getItem(LS_SESSION));
  renderAvatarInto($("#nav-avatar"), profile);
}

function wireProfileGate() {
  $("#gate-manage").addEventListener("click", () => {
    gateEditing = !gateEditing;
    $("#add-profile-panel").classList.add("hidden");
    renderGate(false);
  });
  $("#pin-cancel").addEventListener("click", () => {
    pinTarget = null;
    authErrorPin("");
    $("#pin-screen").classList.add("hidden");
    $("#profile-gate").classList.remove("hidden");
  });
}

function getList() {
  try {
    return JSON.parse(localStorage.getItem(pKey(LS_LIST))) || [];
  } catch {
    return [];
  }
}

function inList(id) {
  return getList().some((i) => i.id === Number(id));
}

function toggleList(item) {
  let list = getList();
  const exists = list.some((i) => i.id === item.id);
  if (exists) {
    list = list.filter((i) => i.id !== item.id);
    showToast(`Removed “${item.title}” from your list`);
  } else {
    list.unshift(item);
    showToast(`Added “${item.title}” to your list`);
  }
  localStorage.setItem(pKey(LS_LIST), JSON.stringify(list.slice(0, 50)));
  scheduleCloudSync();
  refreshBookmarkButtons();
  if (currentFilter === "list" && $("#search-results").classList.contains("hidden")) {
    renderRows("list");
  }
}

function refreshBookmarkButtons() {
  document.querySelectorAll(".card").forEach((card) => {
    const btn = card.querySelector(".bookmark-btn");
    if (btn) btn.classList.toggle("active", inList(card.dataset.id));
  });
}

function showToast(msg) {
  const root = $("#toast-root");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

let suggestToken = 0;

function setupSearch() {
  const input = $("#search-input");
  const box = $("#search-suggest");

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (!q) {
      hideSuggest();
      if (!$("#search-results").classList.contains("hidden")) exitSearch();
      return;
    }
    showSuggestLoading();
    searchTimer = setTimeout(() => runSuggest(q), 300);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(searchTimer);
      const q = input.value.trim();
      if (q) {
        hideSuggest();
        runSearch(q);
      }
    } else if (e.key === "Escape") {
      hideSuggest();
      input.blur();
    }
  });

  input.addEventListener("focus", () => {
    if (input.value.trim() && box.innerHTML) box.classList.remove("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-search")) hideSuggest();
  });
}

function showSuggestLoading() {
  const box = $("#search-suggest");
  box.innerHTML = `<div class="search-suggest-loading">Searching…</div>`;
  box.classList.remove("hidden");
}

function hideSuggest() {
  $("#search-suggest").classList.add("hidden");
}

async function runSuggest(query) {
  const box = $("#search-suggest");
  const myToken = ++suggestToken;
  let data;
  try {
    data = await tmdb("/search/multi", { query, include_adult: false });
  } catch {
    if (myToken !== suggestToken) return;
    box.innerHTML = `<div class="search-suggest-empty">Couldn't load results. Check your connection.</div>`;
    box.classList.remove("hidden");
    return;
  }
  if (myToken !== suggestToken) return;
  if ($("#search-input").value.trim() !== query) return;

  const results = data.results
    .map((r) => normalizeItem(r))
    .filter((r) => r.poster_path && (r.media_type === "movie" || r.media_type === "tv"))
    .slice(0, 6);

  if (!results.length) {
    box.innerHTML = `<div class="search-suggest-empty">No matches for “${escapeHtml(query)}”</div>`;
    box.classList.remove("hidden");
    return;
  }

  box.innerHTML =
    results
      .map(
        (r) => `
      <div class="search-suggest-item" data-id="${r.id}" data-type="${r.media_type}">
        <img src="${img(r.poster_path, "w92")}" alt="" loading="lazy" />
        <div>
          <div class="ss-title">${escapeHtml(r.title)}</div>
          <div class="ss-sub">${r.media_type === "tv" ? "TV Show" : "Movie"}${r.date ? " • " + r.date.slice(0, 4) : ""}</div>
        </div>
      </div>`
      )
      .join("") +
    `<div class="search-suggest-more" id="suggest-see-all">See all results for “${escapeHtml(query)}”</div>`;
  box.classList.remove("hidden");

  box.querySelectorAll(".search-suggest-item").forEach((el) =>
    el.addEventListener("click", () => {
      hideSuggest();
      openDetail(el.dataset.type, el.dataset.id, false);
    })
  );
  $("#suggest-see-all")?.addEventListener("click", () => {
    hideSuggest();
    runSearch(query);
  });
}

async function runSearch(query) {
  let data;
  try {
    data = await tmdb("/search/multi", { query, include_adult: false, language: "en-US" });
  } catch (err) {
    handleFetchError(err);
    return;
  }
  const results = data.results
    .map((r) => normalizeItem(r))
    .filter((r) => r.poster_path);

  const section = $("#search-results");
  const searchWasClosed = section.classList.contains("hidden");
  section.classList.remove("hidden");
  if (searchWasClosed) pushNav();
  $("#hero").classList.add("hidden");
  $("#rows").classList.add("hidden");

  if (!results.length) {
    section.innerHTML = `
      <h2 class="results-title">Results for “${escapeHtml(query)}”</h2>
      <p class="results-sub">0 titles found</p>
      <div class="empty-state"><h2>No matches found</h2><p>Try a different title, person, or keyword.</p></div>`;
    return;
  }

  section.innerHTML = `
    <h2 class="results-title">Results for “${escapeHtml(query)}”</h2>
    <p class="results-sub">${results.length} titles found</p>
    <div class="results-grid"></div>`;
  section.querySelector(".results-grid").innerHTML = results.map(cardHTML).join("");
}

function exitSearch() {
  $("#search-input").value = "";
  hideSuggest();
  $("#search-results").classList.add("hidden");
  $("#rows").classList.remove("hidden");
  if (currentFilter !== "list" && currentFilter !== "movie" && currentFilter !== "tv") {
    $("#hero").classList.remove("hidden");
  }
}

function setupGlobalClickDelegation() {
  document.addEventListener("click", (e) => {
    const menuBtn = e.target.closest(".card-menu-btn");
    if (menuBtn) {
      e.stopPropagation();
      const menu = menuBtn.nextElementSibling;
      const wasOpen = menu.classList.contains("open");
      document.querySelectorAll(".card-menu.open").forEach((m) => m.classList.remove("open"));
      if (!wasOpen) menu.classList.add("open");
      return;
    }
    const removeItem = e.target.closest(".card-menu-item[data-remove-continue-id]");
    if (removeItem) {
      e.stopPropagation();
      removeContinueWatchingCard(removeItem.dataset.removeContinueId);
      return;
    }
    document.querySelectorAll(".card-menu.open").forEach((m) => m.classList.remove("open"));

    const bookmark = e.target.closest(".bookmark-btn");
    if (bookmark) {
      e.stopPropagation();
      const card = bookmark.closest(".card");
      const item = getList().find((i) => i.id === Number(card.dataset.id));
      const fallback = {
        id: Number(card.dataset.id),
        media_type: card.dataset.type,
        title: card.querySelector(".card-title")?.textContent || "Unknown",
        poster_path: null,
        backdrop_path: null,
        vote_average: 0,
        date: "",
        overview: "",
      };
      toggleListFromCard(card, item || fallback);
      return;
    }
    const card = e.target.closest(".card");
    if (card) {
      openDetail(card.dataset.type, card.dataset.id, false);
    }
  });
}

function toggleListFromCard(card, item) {
  const exists = inList(item.id);
  if (!exists) {
    const imgEl = card.querySelector(".card-poster");
    if (imgEl && imgEl.src.includes("image.tmdb.org")) {
      item.poster_path = "/" + imgEl.src.split("/t/p/")[1]?.split("/")[1];
    }
  }
  toggleList(item);
}

function showSetup(isRetry) {
  const overlay = $("#setup-overlay");
  overlay.classList.remove("hidden");
  if (isRetry) $("#api-key-error").classList.remove("hidden");
  const input = $("#api-key-input");
  input.focus();

  const save = async () => {
    const key = input.value.trim();
    if (!key) return;
    try {
      const res = await fetch(`${API_BASE}/configuration?api_key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error();
      apiKey = key;
      localStorage.setItem(LS_KEY, key);
      overlay.classList.add("hidden");
      startApp();
    } catch {
      $("#api-key-error").classList.remove("hidden");
    }
  };
  $("#api-key-save").onclick = save;
  input.onkeydown = (e) => {
    if (e.key === "Enter") save();
  };
}

function setupNav() {
  window.addEventListener("scroll", () => {
    $("#navbar").classList.toggle("scrolled", window.scrollY > 40);
  });
  document.querySelectorAll(".nav-links a, .bottom-nav a, #nav-home").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const dest = a.dataset.filter || "home";
      const searchWasOpen = !$("#search-results").classList.contains("hidden");
      exitSearch();
      if (searchWasOpen) popNavIfNeeded();
      if (currentFilter !== "home" && currentFilter !== dest) popNavIfNeeded();
      if (dest !== "home" && dest !== currentFilter) pushNav();
      setFilter(dest);
      $("#nav-links")?.classList.remove("open");
      window.scrollTo(0, 0);
    });
  });
  $("#nav-burger")?.addEventListener("click", (e) => {
    e.stopPropagation();
    $("#nav-links").classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    const links = $("#nav-links");
    if (links && links.classList.contains("open") && !links.contains(e.target) && e.target !== $("#nav-burger")) {
      links.classList.remove("open");
    }
  });
}

// Applies a normalized playback update to the progress store. Different
// embed providers report progress in completely different shapes (see the
// two message parsers below) but they all funnel through here.
function applyPlaybackUpdate({ id, mediaType, season, episode, currentTime, duration, finished }) {
  if (!currentPlayer) return;
  const store = getWatchStore();
  const prev = store[id] || {};
  const isTv = mediaType === "tv";
  if (isTv) {
    currentPlayer.season = season || currentPlayer.season || 1;
    currentPlayer.episode = episode || currentPlayer.episode || 1;
  }
  if (finished) {
    if (isTv) {
      const finishedSeason = season || currentPlayer.season || 1;
      const finishedEpisode = episode || currentPlayer.episode || 1;
      markEpWatched(id, finishedSeason, finishedEpisode);
      const next = nextEpisodeOf(currentPlayer, finishedSeason, finishedEpisode);
      if (next) {
        store[id] = {
          t: 0,
          d: 0,
          media_type: "tv",
          season: next.season,
          episode: next.episode,
          upNext: true,
          title: currentPlayer.title || prev.title,
          poster_path: prev.poster_path || currentPlayer.poster_path,
          backdrop_path: prev.backdrop_path || currentPlayer.backdrop_path,
        };
      } else {
        // No next episode known (series finale, or episode counts unavailable) — nothing left to continue.
        delete store[id];
      }
    } else {
      delete store[id];
    }
  } else if (currentTime >= 10) {
    // Ignore near-zero readings: some players briefly report a reset time
    // right after seeking to a resume point, which would otherwise wipe
    // out an already-saved Continue Watching entry.
    store[id] = {
      t: currentTime,
      d: duration || prev.d || 0,
      media_type: mediaType,
      season: isTv ? season || currentPlayer.season || 1 : undefined,
      episode: isTv ? episode || currentPlayer.episode || 1 : undefined,
      title: currentPlayer.title || prev.title,
      poster_path: prev.poster_path || currentPlayer.poster_path,
      backdrop_path: prev.backdrop_path || currentPlayer.backdrop_path,
    };
  } else {
    return;
  }
  localStorage.setItem(pKey(LS_PROGRESS), JSON.stringify(store));
  scheduleCloudSync();
}

window.addEventListener("message", function (event) {
  // Different embed providers post messages differently: some send a JSON
  // string, others (VidLink, confirmed live) send a real structured-clone
  // object directly. Handle both instead of assuming one shape.
  let msg = event.data;
  if (typeof msg === "string") {
    try {
      msg = JSON.parse(msg);
    } catch {
      return;
    }
  }
  if (!msg || typeof msg !== "object" || !currentPlayer) return;
  if (!PLAYER_SOURCES[getPlayerSourceId()].supportsEvents) return;

  // VidKing's format: one event per message, with season/episode included directly.
  if (msg.type === "PLAYER_EVENT") {
    const d = msg.data || {};
    if (!d.id || typeof d.currentTime !== "number") return;
    applyPlaybackUpdate({
      id: d.id,
      mediaType: d.mediaType || currentPlayer.type,
      season: d.season,
      episode: d.episode,
      currentTime: d.currentTime,
      duration: d.duration,
      finished: d.event === "ended",
    });
    const chip = document.querySelector("#messageArea");
    if (chip) {
      const icons = { play: "▶ ", pause: "⏸ ", ended: "✓ ", seeked: "⏩ ", timeupdate: "" };
      chip.innerText = (icons[d.event] ?? "• ") + fmtTime(d.currentTime) + (d.duration ? " / " + fmtTime(d.duration) : "");
    }
    return;
  }

  // VidLink's format: a snapshot of every title it has ever tracked in this
  // browser, keyed by TMDB id, with its own watched/duration + last episode.
  if (msg.type === "MEDIA_DATA") {
    const entry = (msg.data || {})[String(currentPlayer.id)];
    if (!entry || !entry.progress) return;
    const watched = entry.progress.watched || 0;
    const duration = entry.progress.duration || 0;
    const isTv = entry.type === "tv";
    const season = isTv ? Number(entry.last_season_watched) || currentPlayer.season || 1 : 1;
    const episode = isTv ? Number(entry.last_episode_watched) || currentPlayer.episode || 1 : 1;
    applyPlaybackUpdate({
      id: currentPlayer.id,
      mediaType: entry.type || currentPlayer.type,
      season,
      episode,
      currentTime: watched,
      duration,
      finished: duration > 0 && (watched >= duration - 20 || watched / duration >= 0.95),
    });
    const chip = document.querySelector("#messageArea");
    if (chip) chip.innerText = fmtTime(watched) + (duration ? " / " + fmtTime(duration) : "");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($("#modal-overlay")) {
      closeModal();
      popNavIfNeeded();
    }
    if (!$("#search-results").classList.contains("hidden")) {
      exitSearch();
      popNavIfNeeded();
    }
  }
});

window.addEventListener("load", () => {
  applyI18n();
  setupNav();
  setupSearch();
  setupGlobalClickDelegation();
  wireProfileGate();
  wireAuth();
  wireAvatarMenu();
  initAuth();
  initEmailDelivery();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});
