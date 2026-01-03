import pymysql
import time
import bcrypt
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import StaleElementReferenceException
import mysql.connector 



DB_CONFIG = {
    'user': 'root',
    'password': 'mariadb',
    'host': 'localhost',
    'database': 'fundapecas_db'
}

TEST_USER = {
    "email": "joao@test.com",
    "password": "123456",
    "username": "JoaoTest",
    "full_name": "Joao Test"
}

TEST_ADMIN = {
    "email": "admin@fundapecas.pt",
    "password": "123456Tt",
    "username": "admin"
}

def setup_test_user():
    print("DB: Attempting connection with PyMySQL...")
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='mariadb',
            database='fundapecas_db',
            port=3306,
            connect_timeout=5
        )
        print("DB: Connected successfully!")
        cursor = conn.cursor()
        
        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw(TEST_USER["password"].encode('utf-8'), salt).decode('utf-8')

        query = """
        INSERT INTO users (username, email, password_hash, full_name, role, is_active, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW(3))
        ON DUPLICATE KEY UPDATE password_hash=%s, is_active=true
        """
        cursor.execute(query, ("joaoTest", TEST_USER["email"], hashed_pw, TEST_USER["full_name"], "ADMIN", True, hashed_pw))
        
        conn.commit()
        print("DB: Test user ready.")
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def teardown_test_user():
    print("DB: Cleaning up test user...")
    conn = None
    try:
        # Using PyMySQL to avoid the Docker handshake hang
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='mariadb',
            database='fundapecas_db',
            port=3306,
            connect_timeout=5
        )
        cursor = conn.cursor()
        
        # Using the specific email from your test
        cursor.execute("DELETE FROM users WHERE email = %s", ("joaoTest@test.com",))
        
        conn.commit()
        print("DB: Test user deleted successfully.")
    except Exception as e:
        print(f"Teardown Warning: {e}")
    finally:
        if conn:
            cursor.close()
            conn.close()


def test_success_authentication_realUser():

    setup_test_user() 
    
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 10)
    
    try:
        driver.get("http://localhost:8081/login")
        print("UI: Browser opened at login page")

        print("UI: Typing username...")
        send_keys_safely(wait, '[data-testid="username-input"]', "joaoTest")

        print("UI: Typing password...")
        send_keys_safely(wait, '[data-testid="password-input"]', TEST_USER["password"])

        print("UI: Clicking login button...")
        login_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]')))
        login_btn.click()

        print("UI: Waiting for Home Screen to load...")
        
        wait.until(EC.url_contains("/home"))

    except Exception as e:
        print(f" TEST FAILED: {e}")
        driver.save_screenshot("login_failure.png")
    finally:
        # 5. Clean up
        driver.quit()
        teardown_test_user()




def send_keys_safely(wait, selector, keys):
    for i in range(3):  
        try:
            element = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
            element.clear()
            element.send_keys(keys)
            return 
        except StaleElementReferenceException:
            if i == 2: raise 
            time.sleep(0.5)

def test_success_authentication():
    driver = webdriver.Chrome()
    driver.get("http://localhost:8081/login")
    wait = WebDriverWait(driver, 10)

    try:
        print("Added username")
        send_keys_safely(wait, '[data-testid="username-input"]', "admin")

        print("Added password")
        send_keys_safely(wait, '[data-testid="password-input"]', "123456Tt")

        print("Clicked login")
        login_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]')))
        login_btn.click()

        print("Going to Home Page")
        wait.until(EC.url_contains("/home"))
        print("SUCCESS: Authenticated and redirected!")

    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        driver.quit()



def test_unsuccess_authentication():
    driver = webdriver.Chrome()
    driver.get("http://localhost:8081/login")
    wait = WebDriverWait(driver, 10)

    try:
        print("Added username")
        send_keys_safely(wait, '[data-testid="username-input"]', "wronguser")

        print("Added password")
        send_keys_safely(wait, '[data-testid="password-input"]', "wrongpassword")

        print("Clicked login")
        login_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]')))
        login_btn.click()

        error_element = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="error_message"]'))
        )

        error_text = error_element.text
        print(f"Detected error message: '{error_text}'")

    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        driver.quit()


def test_profile_password_change():
    driver = webdriver.Chrome()
    driver.get("http://localhost:8081/login")
    wait = WebDriverWait(driver, 10)
    setup_test_user()
    new_password =  TEST_USER["password"] + "1aA"
    try:

        print("Added username")
        send_keys_safely(wait, '[data-testid="username-input"]', "joaoTest")

        print("Added password")
        send_keys_safely(wait, '[data-testid="password-input"]',  TEST_USER["password"])

        print("Clicked login")
        login_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]')))
        login_btn.click()

        wait.until(EC.url_contains("/home"))

        driver.get("http://localhost:8081/Parts/ALT-BMW-001")

        header_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="header-trigger"]')))
        header_btn.click()

        profile_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="profile-button"]')))
        profile_btn.click()

        wait.until(EC.url_contains("/profile"))

        passwoed_change_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="passwordchange-button"]')))
        passwoed_change_btn.click()
     

        send_keys_safely(wait, '[data-testid="passwordatual-input"]',  TEST_USER["password"])

        send_keys_safely(wait, '[data-testid="passwordnova-input"]', new_password)

        send_keys_safely(wait, '[data-testid="passwordnovaconfirm-input"]', new_password)

        passwoed_change_confirm_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="passwordchangeconfirmation-button"]')))
        passwoed_change_confirm_btn.click()

        wait.until(EC.url_contains("/login"))

        print("Added username")
        send_keys_safely(wait, '[data-testid="username-input"]', "joaoTest")

        print("Added password")
        send_keys_safely(wait, '[data-testid="password-input"]',  new_password)

        login_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]')))
        login_btn.click()

        wait.until(EC.url_contains("/home"))
        print("SUCCESS: Authenticated and redirected!")
        teardown_test_user()
    except Exception as e:
        print(f"Test failed: {e}")
        teardown_test_user()

    finally:
        teardown_test_user()
        driver.quit()


def test_unsuccess_authentication_manytimes_error():
    driver = webdriver.Chrome()
    driver.get("http://localhost:8081/login")
    wait = WebDriverWait(driver, 10)

    try:
        for i in range(11):
            print("Added username")
            send_keys_safely(wait, '[data-testid="username-input"]', "wronguser")

            print("Added password")
            send_keys_safely(wait, '[data-testid="password-input"]', "wrongpassword")

            print("Clicked login")
            login_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]')))
            login_btn.click()

            error_element = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="error_message"]'))
            )
            target_text_es = 'Too many login attempts, please try again later.'
            target_text_pt = 'Demasiadas tentativas. Aguarda alguns minutos.'
            error_text = error_element.text
            print(error_text)
            if error_text == target_text_es or error_text == target_text_pt:
                print("SUCESS: Detected rate limit error message.")
                return

        print(f"Detected error message: '{error_text}'")

    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        driver.quit()


def test_refresh_limit_error():
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 10)
    
    attempts = 12
    expected_msg = 'Too many refresh attempts, please try again later.'
    
    try:
        perform_login(driver, wait, "admin", "123456Tt")
                
        for i in range(1, attempts + 1):
            driver.get("http://localhost:8081/home") # Rota hipotética
            
            time.sleep(0.5) # Pequena pausa entre pedidos
            
            try:
                error_el = driver.find_element(By.CSS_SELECTOR, '[data-testid="error_message"]')
                current_text = error_el.text
                
                if expected_msg in current_text:
                    print(f"SUCESS: Rate limit triggered on Refresh number {i}")
                    return
            except:
                pass  # Nenhum erro encontrado nesta iteração
        
        print("FAIL: no refresh rate limit triggered")

    except Exception as e:
        print(f"Erro no teste: {e}")
    finally:
        driver.quit()

######################################
#### NEW TESTS BELOW THIS LINE #######
######################################


def perform_login(driver, wait, user, pw):
    driver.get("http://localhost:8081/login")
    send_keys_safely(wait, '[data-testid="username-input"]', user)
    send_keys_safely(wait, '[data-testid="password-input"]', pw)
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]'))).click()
    wait.until(EC.url_contains("/home"))


def update_password_timestamp(username):
    """Manually simulates a password change in the DB by updating the timestamp."""
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # Set update time to 'now' so existing tokens become 'older' (invalid)
            # Use NOW(3) to match your Prisma setup
            sql = "UPDATE users SET password_updated_at = NOW(3) WHERE username = %s"
            cursor.execute(sql, (username,))
        conn.commit()
        print(f"DB: password_updated_at updated for {username}")
    finally:
        conn.close()

#End-to-End Security Integration Test
def test_security_token_invalidation_on_timestamp_change():
    """Tests if the 'authenticate' middleware kicks the user out when the DB timestamp changes."""
    setup_test_user()
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 10)
    
    try:
        print("Test: Logging in to get valid session...")
        perform_login(driver, wait, TEST_USER["username"], TEST_USER["password"])
        
        print("Test: Simulating backend password update...")
        update_password_timestamp(TEST_USER["username"])
        
        print("Test: Refreshing page - should redirect to login...")
        driver.refresh()
        
        # The middleware should see iat < password_updated_at and return 401
        try:
            wait.until(EC.url_contains("/login"))
            print("SUCCESS: Security middleware invalidated old token correctly.")
        except:
            print("FAILED: User was not redirected to login after password timestamp change.")
    finally:
        driver.quit()


# perform movement and stock check
def test_stock_movement_logic():
    """Tests if performing a stock IN movement reflects in the DB (StockMovementController)."""
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 10)
    
    try:
        perform_login(driver, wait, "admin", "123456Tt")
        
        # Navigate to a specific part (Assuming you have a test part)
        driver.get("http://localhost:8081/Parts/ALT-BMW-001")
        
        # 1. Capture current stock from UI
        stock_el = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="current-stock-text"]')))
        initial_stock = int(stock_el.text)
        
        # 2. Perform Stock Movement 'IN'
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="add-stock-btn"]'))).click()
        send_keys_safely(wait, '[data-testid="stock-quantity-input"]', "10")
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="confirm-stock-btn"]'))).click()
        
        # 3. Verify UI Updates
        time.sleep(2)
        new_stock = int(driver.find_element(By.CSS_SELECTOR, '[data-testid="current-stock-text"]').text)
        
        if new_stock == initial_stock + 10:
            print("SUCCESS: Stock movement correctly calculated.")
        else:
            print(f"FAILED: Stock mismatch. Expected {initial_stock+10}, got {new_stock}")
            
    finally:
        driver.quit()

# ainda dá para adicionar delete favorite
def test_favorites_persistence():
    """Tests favorites.controller.ts logic: adding a favorite and checking the list."""
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 10)
    
    try:
        perform_login(driver, wait, "admin", "123456Tt")
        
        # 1. Go to a part and favorite it
        driver.get("http://localhost:8081/parts/detail/REF_TEST")
        fav_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="favorite-toggle"]')))
        fav_btn.click()
        
        # 2. Navigate to Favorites page
        driver.get("http://localhost:8081/favorites")
        
        # 3. Check if the part exists in the list
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="favorite-item-REF_TEST"]')))
        print("✅ SUCCESS: Favorite persisted and listed correctly.")
        
    finally:
        driver.quit()


def why_is_there_no_stock_displayed():
    driver = webdriver.Chrome()
    driver.get("http://localhost:8081/login")
    wait = WebDriverWait(driver, 10)
    setup_test_user()
    new_password =  TEST_USER["password"] + "1aA"
    try:

        print("Added username")
        send_keys_safely(wait, '[data-testid="username-input"]', "joaoTest")

        print("Added password")
        send_keys_safely(wait, '[data-testid="password-input"]',  TEST_USER["password"])

        print("Clicked login")
        login_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-button"]')))
        login_btn.click()

        wait.until(EC.url_contains("/home"))

        driver.get("http://localhost:8081/Parts/ALT-BMW-001")
        wait.until(EC.url_contains("/home"))

    except Exception as e:
        print(f"Test failed: {e}")



if __name__ == "__main__":
    
    # Test successful authentication with default ADMIN user
    #test_success_authentication()

    # Test successful authentication with default CLIENT user
    #test_success_authentication_realUser()

    # Test unsuccessful authentication
    #test_unsuccess_authentication()

    # Test password change & login with new password
    #test_profile_password_change()

    # 'Demasiadas tentativas. Aguarda alguns minutos.'
    #test_unsuccess_authentication_manytimes_error()

    test_refresh_limit_error()

    #test_security_token_invalidation_on_timestamp_change()

    #test_stock_movement_logic()

    #test_favorites_persistence()

    #why_is_there_no_stock_displayed()