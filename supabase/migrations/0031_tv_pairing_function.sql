-- TV Pairing Function
-- This function retrieves TV configuration based on an OTP code
-- and returns the listing config + current guest info

CREATE OR REPLACE FUNCTION public.get_device_config(p_otp TEXT)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_listing listings%ROWTYPE;
  v_guest guests%ROWTYPE;
  v_qr_codes JSONB;
  v_result JSONB;
BEGIN
  -- Find the TV device by OTP
  SELECT * INTO v_device
  FROM public.tv_devices
  WHERE otp = p_otp
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid OTP code. Please check your code and try again.';
  END IF;

  -- Update last_seen_at and is_online status
  UPDATE public.tv_devices
  SET last_seen_at = NOW(),
      is_online = true
  WHERE id = v_device.id;

  -- Get the listing details
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = v_device.listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found for this device.';
  END IF;

  -- Find current/upcoming guest (check-in is today or in the future, check-out hasn't passed)
  SELECT * INTO v_guest
  FROM public.guests
  WHERE listing_id = v_listing.id
    AND check_out >= CURRENT_DATE
  ORDER BY check_in ASC
  LIMIT 1;

  -- Get all QR codes for this listing
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'type', type,
      'details', details,
      'qrImageUrl', qr_image_url
    )
    ORDER BY display_order
  ), '[]'::jsonb) INTO v_qr_codes
  FROM public.qr_codes
  WHERE listing_id = v_listing.id;

  -- Build the result
  v_result := jsonb_build_object(
    'layout', jsonb_build_object(
      'layout_key', v_listing.tv_layout,
      'backgroundImage', v_listing.background_image,
      'backgroundVideo', v_listing.background_video,
      'backgroundMusic', v_listing.background_music,
      'carouselImages', v_listing.carousel_images,
      'logo', v_listing.logo,
      'showLogo', v_listing.show_logo,
      'language', v_listing.language,
      'wifiNetwork', v_listing.wifi_network,
      'wifiPassword', v_listing.wifi_password,
      'contactPhone', v_listing.contact_phone,
      'contactEmail', v_listing.contact_email,
      'websiteUrl', v_listing.website_url,
      'toursLink', v_listing.tours_link,
      'standardCheckInTime', v_listing.standard_check_in_time,
      'standardCheckOutTime', v_listing.standard_check_out_time,
      'hoursOfOperationFrom', v_listing.hours_of_operation_from,
      'hoursOfOperationTo', v_listing.hours_of_operation_to,
      'welcomeGreeting', v_listing.welcome_greeting,
      'welcomeMessage', v_listing.welcome_message,
      'weatherCity', v_listing.weather_city,
      'weatherUnit', v_listing.weather_unit,
      'showCheckInOut', v_listing.show_check_in_out,
      'showHoursOfOperation', v_listing.show_hours_of_operation,
      'showWifi', v_listing.show_wifi,
      'showContact', v_listing.show_contact,
      'showWeather', v_listing.show_weather,
      'showQRCodes', v_listing.show_qr_codes,
      'showWelcomeMessage', v_listing.show_welcome_message,
      'qrCodes', v_qr_codes
    ),
    'guest', CASE
      WHEN v_guest.id IS NOT NULL THEN
        jsonb_build_object(
          'firstName', v_guest.first_name,
          'lastName', v_guest.last_name,
          'email', v_guest.email,
          'phone', v_guest.phone,
          'language', v_guest.language,
          'checkIn', v_guest.check_in,
          'checkOut', v_guest.check_out
        )
      ELSE NULL
    END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (TVs don't need to be authenticated)
GRANT EXECUTE ON FUNCTION public.get_device_config(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_device_config(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_device_config(TEXT) IS 'Retrieves TV display configuration and current guest info based on OTP code';
