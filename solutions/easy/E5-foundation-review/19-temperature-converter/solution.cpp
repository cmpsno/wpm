#include <iomanip>
#include <iostream>
int main() { double celsius; std::cin >> celsius; std::cout << std::fixed << std::setprecision(2) << "Fahrenheit: " << celsius * 9 / 5 + 32 << "\nKelvin: " << celsius + 273.15 << "\n"; }
