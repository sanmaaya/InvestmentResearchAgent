import sys
import json
import sqlite3

def run_dcf(current_price, free_cash_flow, growth_rate, shares_outstanding, wacc=0.08, terminal_growth=0.02, forecast_years=5):
    """
    Executes a Discounted Cash Flow (DCF) valuation algorithm to compute intrinsic stock value.
    Forecasts free cash flows (FCF), determines Terminal Value, and discounts them to present value using WACC.
    """
    projected_fcf = []
    temp_fcf = free_cash_flow
    
    # 1. Project Free Cash Flows for 5 years
    for _ in range(1, forecast_years + 1):
        temp_fcf = temp_fcf * (1 + growth_rate)
        projected_fcf.append(temp_fcf)
        
    # 2. Calculate Terminal Value using Gordon Growth Method
    terminal_value = (projected_fcf[-1] * (1 + terminal_growth)) / (wacc - terminal_growth)
    
    # 3. Discount future cash flows back to Present Value
    discount_factors = [(1 + wacc) ** i for i in range(1, forecast_years + 1)]
    pv_forecast = sum(fcf / df for fcf, df in zip(projected_fcf, discount_factors))
    pv_terminal = terminal_value / discount_factors[-1]
    
    # 4. Compute Intrinsic Value Per Share
    enterprise_value = pv_forecast + pv_terminal
    intrinsic_value_per_share = enterprise_value / shares_outstanding
    
    upside = (intrinsic_value_per_share - current_price) / current_price
    verdict = "UNDERVALUED (BUY)" if upside > 0.1 else "OVERVALUED (SELL)" if upside < -0.1 else "FAIR VALUE (HOLD)"
    
    return {
        "intrinsic_value": round(intrinsic_value_per_share, 2),
        "current_price": current_price,
        "upside_percent": round(upside * 100, 2),
        "verdict": verdict,
        "forecasted_fcfs": [round(f, 2) for f in projected_fcf]
    }

def save_to_db(ticker, valuation):
    """
    Saves the valuation results to a relational database vault.
    Demonstrates Postgres/MySQL relational schema patterns using SQLite structure.
    """
    try:
        # Connect to SQLite file (simulating Postgres schema locally)
        conn = sqlite3.connect("vault.db")
        cursor = conn.cursor()
        
        # Create Table matching database guidelines
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS valuations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            current_price REAL,
            intrinsic_value REAL,
            upside REAL,
            verdict TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Insert Valuation Entry
        cursor.execute("""
        INSERT INTO valuations (ticker, current_price, intrinsic_value, upside, verdict)
        VALUES (?, ?, ?, ?, ?)
        """, (ticker, valuation["current_price"], valuation["intrinsic_value"], valuation["upside_percent"], valuation["verdict"]))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Database error: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    # If run with command-line arguments: ticker current_price fcf growth_rate shares
    if len(sys.argv) >= 6:
        try:
            ticker = sys.argv[1].upper()
            price = float(sys.argv[2])
            fcf = float(sys.argv[3])
            growth = float(sys.argv[4])
            shares = float(sys.argv[5])
            
            result = run_dcf(price, fcf, growth, shares)
            print(json.dumps(result, indent=2))
            save_to_db(ticker, result)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        # Print a demo run for AAPL
        demo = run_dcf(current_price=175.0, free_cash_flow=100000000000.0, growth_rate=0.08, shares_outstanding=15400000000.0)
        print("Demo DCF Valuation run for Apple Inc. (AAPL):")
        print(json.dumps(demo, indent=2))
        save_to_db("AAPL", demo)
        print("\nDemo results successfully cached to database 'vault.db'.")
