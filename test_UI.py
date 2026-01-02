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
    "full_name": "JoaoTest"
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

    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        driver.quit()





if __name__ == "__main__":
    
    # Test successful authentication with default ADMIN user
    test_success_authentication()

    # Test successful authentication with default CLIENT user
    test_success_authentication_realUser()

    # Test unsuccessful authentication
    test_unsuccess_authentication()

    # Test password change & login with new password
    test_profile_password_change()
