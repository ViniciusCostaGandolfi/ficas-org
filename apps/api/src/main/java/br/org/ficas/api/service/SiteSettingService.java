package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.SiteSettingRepository;
import br.org.ficas.api.dto.settings.SiteSettingsDto;
import br.org.ficas.api.model.entity.SiteSetting;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteSettingService {

    private static final String DEFAULT_SITE_NAME = "FICAS";
    private static final String DEFAULT_SITE_DESCRIPTION =
            "Compartilhando conhecimentos, transformando pessoas e organizações";

    /** Published social links seeded for a fresh install (also mirrored into the existing dev row). */
    private static final SiteSettingsDto.Social DEFAULT_SOCIAL = new SiteSettingsDto.Social(
            "https://www.instagram.com/insta_ficas/",
            "https://www.facebook.com/ficas.sp",
            "",
            "https://twitter.com/FICAS_SP",
            "https://br.linkedin.com/company/ficas");

    private final SiteSettingRepository siteSettingRepository;

    public SiteSettingService(SiteSettingRepository siteSettingRepository) {
        this.siteSettingRepository = siteSettingRepository;
    }

    @Transactional(readOnly = true)
    public SiteSettingsDto get() {
        return toDto(requireSetting());
    }

    @Transactional
    public SiteSettingsDto update(SiteSettingsDto dto) {
        SiteSetting setting = requireSetting();
        setting.setSiteName(dto.siteName());
        setting.setSiteDescription(dto.siteDescription());
        setting.setLogoUrl(dto.logoUrl());
        setting.setFaviconUrl(dto.faviconUrl());
        setting.setSocial(socialMap(dto.social()));
        setting.setContact(contactMap(dto.contact()));
        setting.setPix(pixMap(dto.pix()));
        return toDto(setting);
    }

    private SiteSetting requireSetting() {
        return siteSettingRepository.findById(SiteSetting.SINGLETON_ID)
                .orElseThrow(() -> NotFoundException.of("SiteSettings", SiteSetting.SINGLETON_ID));
    }

    /** Builds the default singleton used by the seeder. */
    public static SiteSetting defaultSetting() {
        SiteSetting setting = new SiteSetting();
        setting.setSiteName(DEFAULT_SITE_NAME);
        setting.setSiteDescription(DEFAULT_SITE_DESCRIPTION);
        setting.setLogoUrl("/brand/logo-ficas.png");
        setting.setFaviconUrl(null);
        setting.setSocial(socialMap(DEFAULT_SOCIAL));
        setting.setContact(contactMap(new SiteSettingsDto.Contact("", "", "")));
        setting.setPix(pixMap(new SiteSettingsDto.Pix("", null, List.of())));
        return setting;
    }

    public static SiteSettingsDto toDto(SiteSetting setting) {
        return new SiteSettingsDto(
                setting.getSiteName(),
                setting.getSiteDescription(),
                setting.getLogoUrl(),
                setting.getFaviconUrl(),
                new SiteSettingsDto.Social(
                        string(setting.getSocial(), "instagram"),
                        string(setting.getSocial(), "facebook"),
                        string(setting.getSocial(), "youtube"),
                        string(setting.getSocial(), "twitter"),
                        string(setting.getSocial(), "linkedin")),
                new SiteSettingsDto.Contact(
                        string(setting.getContact(), "email"),
                        string(setting.getContact(), "phone"),
                        string(setting.getContact(), "address")),
                new SiteSettingsDto.Pix(
                        string(setting.getPix(), "key"),
                        nullableString(setting.getPix(), "qrImageUrl"),
                        stringList(setting.getPix(), "suggestedAmounts")));
    }

    private static Map<String, Object> socialMap(SiteSettingsDto.Social social) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("instagram", social == null ? "" : nullToEmpty(social.instagram()));
        map.put("facebook", social == null ? "" : nullToEmpty(social.facebook()));
        map.put("youtube", social == null ? "" : nullToEmpty(social.youtube()));
        map.put("twitter", social == null ? "" : nullToEmpty(social.twitter()));
        map.put("linkedin", social == null ? "" : nullToEmpty(social.linkedin()));
        return map;
    }

    private static Map<String, Object> contactMap(SiteSettingsDto.Contact contact) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("email", contact == null ? "" : nullToEmpty(contact.email()));
        map.put("phone", contact == null ? "" : nullToEmpty(contact.phone()));
        map.put("address", contact == null ? "" : nullToEmpty(contact.address()));
        return map;
    }

    private static Map<String, Object> pixMap(SiteSettingsDto.Pix pix) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("key", pix == null ? "" : nullToEmpty(pix.key()));
        map.put("qrImageUrl", pix == null ? null : pix.qrImageUrl());
        map.put("suggestedAmounts", pix == null || pix.suggestedAmounts() == null ? List.of() : pix.suggestedAmounts());
        return map;
    }

    private static String string(Map<String, Object> map, String key) {
        return nullToEmpty(stringOrNull(map, key));
    }

    private static String stringOrNull(Map<String, Object> map, String key) {
        Object value = map == null ? null : map.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private static String nullableString(Map<String, Object> map, String key) {
        return stringOrNull(map, key);
    }

    private static List<String> stringList(Map<String, Object> map, String key) {
        Object value = map == null ? null : map.get(key);
        if (value instanceof List<?> list) {
            List<String> result = new ArrayList<>(list.size());
            list.forEach(element -> result.add(element == null ? null : String.valueOf(element)));
            return result;
        }
        return List.of();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
