-- Create function to create confirmed users
CREATE OR REPLACE FUNCTION create_confirmed_driver(
  driver_email TEXT,
  driver_password TEXT,
  driver_name TEXT,
  vehicle_number TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Generate new UUID
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users with confirmation
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    new_user_id,
    driver_email,
    crypt(driver_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    FALSE,
    'authenticated'
  );
  
  -- Insert into profiles
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    is_approved
  ) VALUES (
    new_user_id,
    driver_email,
    driver_name,
    'ambulance',
    TRUE
  );
  
  -- Insert ambulance if vehicle_number provided
  IF vehicle_number IS NOT NULL THEN
    INSERT INTO ambulances (
      driver_id,
      vehicle_number,
      current_lat,
      current_lng,
      heading,
      speed,
      emergency_status
    ) VALUES (
      new_user_id,
      vehicle_number,
      0,
      0,
      0,
      0,
      'inactive'
    );
  END IF;
  
  result := json_build_object('user_id', new_user_id, 'email', driver_email);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;